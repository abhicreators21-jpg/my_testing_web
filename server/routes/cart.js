/** Cart routes. Every cart lives in SQLite, keyed by the signed-in user. */
import { Router } from 'express';
import { db } from '../db.js';
import { Validator, asyncHandler, badRequest, notFound, parseId } from '../utils.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

export const FREE_SHIPPING_THRESHOLD_CENTS = 5000;
export const SHIPPING_FEE_CENTS = 499;

export function loadCart(userId) {
  const rows = db
    .prepare(
      `SELECT ci.product_id, ci.quantity,
              p.name, p.price_cents, p.image_url, p.stock, p.category_id
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
        WHERE ci.user_id = ?
        ORDER BY ci.created_at ASC, ci.id ASC`,
    )
    .all(userId);

  const items = rows.map((row) => ({
    productId: row.product_id,
    name: row.name,
    priceCents: row.price_cents,
    quantity: row.quantity,
    stock: row.stock,
    imageUrl: row.image_url,
    lineTotalCents: row.price_cents * row.quantity,
  }));

  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const shippingCents =
    items.length === 0 || subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FEE_CENTS;

  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    freeShippingThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS,
  };
}

function upsertItem(userId, productId, quantity) {
  const product = db.prepare('SELECT id, stock, name FROM products WHERE id = ?').get(productId);
  if (!product) throw notFound('Product not found');
  if (product.stock <= 0) throw badRequest(`${product.name} is out of stock`);

  const existing = db
    .prepare('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(userId, productId);
  const desired = (existing?.quantity || 0) + quantity;
  const capped = Math.min(desired, product.stock);

  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?').run(
      capped,
      userId,
      productId,
    );
  } else {
    db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(
      userId,
      productId,
      capped,
    );
  }
  return capped;
}

router.get('/', (req, res) => {
  res.json({ cart: loadCart(req.user.id) });
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = new Validator(req.body)
      .int('productId', { min: 1, label: 'Product' })
      .int('quantity', { min: 1, max: 99, required: false, label: 'Quantity' })
      .done();

    const quantity = data.quantity || 1;
    upsertItem(req.user.id, data.productId, quantity);
    res.status(201).json({ cart: loadCart(req.user.id) });
  }),
);

router.patch(
  '/:productId',
  asyncHandler(async (req, res) => {
    const productId = parseId(req.params.productId, 'product id');
    const data = new Validator(req.body).int('quantity', { min: 1, max: 99, label: 'Quantity' }).done();

    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId);
    if (!product) throw notFound('Product not found');

    const quantity = Math.min(data.quantity, product.stock);
    if (quantity < 1) throw badRequest('This product is out of stock');

    const info = db
      .prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?')
      .run(quantity, req.user.id, productId);
    if (info.changes === 0) throw notFound('That product is not in your cart');

    res.json({ cart: loadCart(req.user.id) });
  }),
);

router.delete('/:productId', (req, res) => {
  const productId = parseId(req.params.productId, 'product id');
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(
    req.user.id,
    productId,
  );
  res.json({ cart: loadCart(req.user.id) });
});

router.delete('/', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
  res.json({ cart: loadCart(req.user.id) });
});

/** Merge a guest (localStorage) cart into the saved cart after sign-in. */
router.post(
  '/merge',
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
    for (const item of items) {
      const productId = Number(item?.productId);
      const quantity = Number(item?.quantity);
      if (!Number.isInteger(productId) || productId <= 0) continue;
      if (!Number.isInteger(quantity) || quantity <= 0) continue;
      const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId);
      if (!product || product.stock <= 0) continue;
      upsertItem(req.user.id, productId, Math.min(quantity, 99));
    }
    res.json({ cart: loadCart(req.user.id) });
  }),
);

export default router;
