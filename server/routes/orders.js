/** Order routes: checkout from the saved cart, order history, order detail. */
import { Router } from 'express';
import { db } from '../db.js';
import { Validator, asyncHandler, badRequest, forbidden, notFound, parseId } from '../utils.js';
import { requireAuth } from '../auth.js';
import { loadCart, FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_FEE_CENTS } from './cart.js';

const router = Router();
router.use(requireAuth);

export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export function shapeOrder(row, items) {
  return {
    id: row.id,
    userId: row.user_id,
    customerName: row.customer_name || null,
    customerEmail: row.customer_email || null,
    status: row.status,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shipping: {
      name: row.shipping_name,
      address: row.shipping_address,
      city: row.shipping_city,
      zip: row.shipping_zip,
      country: row.shipping_country,
      phone: row.shipping_phone || '',
    },
    items: items.map((item) => ({
      productId: item.product_id,
      name: item.product_name,
      unitPriceCents: item.unit_price_cents,
      quantity: item.quantity,
      imageUrl: item.image_url,
      lineTotalCents: item.unit_price_cents * item.quantity,
    })),
  };
}

export function fetchOrderItems(orderId) {
  return db
    .prepare(
      `SELECT product_id, product_name, unit_price_cents, quantity, image_url
         FROM order_items WHERE order_id = ? ORDER BY id ASC`,
    )
    .all(orderId);
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = new Validator(req.body)
      .string('name', { min: 2, max: 80, label: 'Full name' })
      .string('address', { min: 4, max: 200, label: 'Address' })
      .string('city', { min: 2, max: 80, label: 'City' })
      .string('zip', { min: 2, max: 20, label: 'ZIP / postal code' })
      .string('country', { min: 2, max: 80, label: 'Country' })
      .string('phone', { required: false, max: 40, label: 'Phone' })
      .enum('paymentMethod', ['card', 'cod'], { required: false, label: 'Payment method' })
      .done();

    const cart = loadCart(req.user.id);
    if (cart.items.length === 0) throw badRequest('Your cart is empty');

    const stockRows = cart.items.map((item) =>
      db.prepare('SELECT id, name, stock FROM products WHERE id = ?').get(item.productId),
    );
    const shortages = [];
    stockRows.forEach((row, index) => {
      const item = cart.items[index];
      if (!row) shortages.push(`${item.name} is no longer available`);
      else if (row.stock < item.quantity) {
        shortages.push(`${item.name} only has ${row.stock} left in stock`);
      }
    });
    if (shortages.length) throw badRequest('Some items are unavailable', { cart: shortages.join('. ') });

    const subtotalCents = cart.subtotalCents;
    const shippingCents = subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FEE_CENTS;
    const totalCents = subtotalCents + shippingCents;
    const paymentMethod = data.paymentMethod || 'card';

    const placeOrder = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO orders (user_id, status, subtotal_cents, shipping_cents, total_cents, payment_method,
             shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country, shipping_phone)
           VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          req.user.id,
          subtotalCents,
          shippingCents,
          totalCents,
          paymentMethod,
          data.name,
          data.address,
          data.city,
          data.zip,
          data.country,
          data.phone || '',
        );

      const orderId = info.lastInsertRowid;
      const insertItem = db.prepare(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity, image_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      const decStock = db.prepare(
        'UPDATE products SET stock = MAX(stock - ?, 0), updated_at = datetime(\'now\') WHERE id = ?',
      );
      for (const item of cart.items) {
        insertItem.run(
          orderId,
          item.productId,
          item.name,
          item.priceCents,
          item.quantity,
          item.imageUrl,
        );
        decStock.run(item.quantity, item.productId);
      }
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
      return orderId;
    });

    const orderId = placeOrder();
    const row = db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .get(orderId);
    res.status(201).json({ order: shapeOrder(row, fetchOrderItems(orderId)) });
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC')
      .all(req.user.id);
    res.json({ orders: rows.map((row) => shapeOrder(row, fetchOrderItems(row.id))) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'order id');
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!row) throw notFound('Order not found');
    if (row.user_id !== req.user.id && req.user.role !== 'admin') {
      throw forbidden('You can only view your own orders');
    }
    res.json({ order: shapeOrder(row, fetchOrderItems(id)) });
  }),
);

export default router;
