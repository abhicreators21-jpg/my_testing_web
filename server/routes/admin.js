/** Admin routes. Every handler is protected by requireAdmin (role-based authorization). */
import { Router } from 'express';
import { db } from '../db.js';
import { Validator, asyncHandler, ApiError, badRequest, notFound, parseId, slugify } from '../utils.js';
import { requireAdmin } from '../auth.js';
import { shapeProduct, shapeCategory } from './catalog.js';
import { shapeOrder, fetchOrderItems, ORDER_STATUSES } from './orders.js';

const router = Router();
router.use(requireAdmin);

/* ------------------------------- dashboard ------------------------------- */

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const revenue = db
      .prepare("SELECT COALESCE(SUM(total_cents), 0) AS c FROM orders WHERE status <> 'cancelled'")
      .get().c;
    const orderCount = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
    const customerCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'customer'").get().c;
    const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
    const lowStock = db.prepare('SELECT COUNT(*) AS c FROM products WHERE stock <= 10').get().c;

    const statusBreakdown = db
      .prepare('SELECT status, COUNT(*) AS count FROM orders GROUP BY status')
      .all();

    const recentOrders = db
      .prepare(
        `SELECT o.*, u.name AS customer_name, u.email AS customer_email
           FROM orders o JOIN users u ON u.id = o.user_id
          ORDER BY o.created_at DESC, o.id DESC LIMIT 6`,
      )
      .all()
      .map((row) => shapeOrder(row, fetchOrderItems(row.id)));

    const lowStockProducts = db
      .prepare(
        `SELECT p.*, c.name AS category_name, c.slug AS category_slug
           FROM products p LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.stock <= 10 ORDER BY p.stock ASC, p.name ASC LIMIT 6`,
      )
      .all()
      .map(shapeProduct);

    const topProducts = db
      .prepare(
        `SELECT oi.product_name AS name, SUM(oi.quantity) AS units, SUM(oi.quantity * oi.unit_price_cents) AS revenue_cents
           FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE o.status <> 'cancelled'
          GROUP BY oi.product_name ORDER BY units DESC LIMIT 5`,
      )
      .all()
      .map((row) => ({ name: row.name, units: row.units, revenueCents: row.revenue_cents }));

    res.json({
      stats: {
        revenueCents: revenue,
        orderCount,
        customerCount,
        productCount,
        lowStock,
        statusBreakdown: ORDER_STATUSES.map((status) => ({
          status,
          count: statusBreakdown.find((row) => row.status === status)?.count || 0,
        })),
        recentOrders,
        lowStockProducts,
        topProducts,
      },
    });
  }),
);

/* -------------------------------- products ------------------------------- */

const ADMIN_PRODUCT_SELECT = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
`;

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const where = [];
    const params = {};
    if (search) {
      where.push('(p.name LIKE @search OR p.description LIKE @search)');
      params.search = `%${search}%`;
    }
    if (category && category !== 'all') {
      where.push('(c.slug = @category OR CAST(c.id AS TEXT) = @category)');
      params.category = category;
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = db
      .prepare(`${ADMIN_PRODUCT_SELECT} ${whereSql} ORDER BY p.created_at DESC, p.id DESC LIMIT 200`)
      .all(params);
    res.json({ products: rows.map(shapeProduct) });
  }),
);

function readProductBody(body, { partial = false } = {}) {
  const validator = new Validator(body);
  const required = !partial;
  validator.string('name', { required, min: 2, max: 120, label: 'Product name' });
  validator.string('description', { required: false, max: 2000, label: 'Description' });
  validator.price('price', { required, min: 0.01, max: 1_000_000 });
  validator.int('stock', { required, min: 0, max: 100000, label: 'Stock' });
  validator.int('categoryId', { required, min: 1, label: 'Category' });
  validator.url('imageUrl', { required: false });
  validator.int('featured', { required: false, min: 0, max: 1, label: 'Featured' });
  const data = validator.done();

  if (data.categoryId && !db.prepare('SELECT id FROM categories WHERE id = ?').get(data.categoryId)) {
    throw new ApiError(422, 'Please check the highlighted fields', { categoryId: 'Choose a valid category' });
  }
  return data;
}

router.post(
  '/products',
  asyncHandler(async (req, res) => {
    const data = readProductBody(req.body);
    const info = db
      .prepare(
        `INSERT INTO products (name, description, price_cents, stock, image_url, category_id, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.name,
        data.description || '',
        data.price_cents,
        data.stock,
        data.imageUrl || '',
        data.categoryId,
        data.featured ? 1 : 0,
      );
    const row = db.prepare(`${ADMIN_PRODUCT_SELECT} WHERE p.id = ?`).get(info.lastInsertRowid);
    res.status(201).json({ product: shapeProduct(row) });
  }),
);

router.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'product id');
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) throw notFound('Product not found');

    const data = readProductBody(req.body, { partial: true });
    db.prepare(
      `UPDATE products
          SET name = ?, description = ?, price_cents = ?, stock = ?, image_url = ?,
              category_id = ?, featured = ?, updated_at = datetime('now')
        WHERE id = ?`,
    ).run(
      data.name ?? existing.name,
      data.description ?? existing.description,
      data.price_cents ?? existing.price_cents,
      data.stock ?? existing.stock,
      data.imageUrl ?? existing.image_url,
      data.categoryId ?? existing.category_id,
      data.featured === undefined ? existing.featured : data.featured ? 1 : 0,
      id,
    );
    const row = db.prepare(`${ADMIN_PRODUCT_SELECT} WHERE p.id = ?`).get(id);
    res.json({ product: shapeProduct(row) });
  }),
);

router.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'product id');
    const info = db.prepare('DELETE FROM products WHERE id = ?').run(id);
    if (info.changes === 0) throw notFound('Product not found');
    res.json({ ok: true, deletedId: id });
  }),
);

/* ------------------------------- categories ------------------------------ */

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const rows = db
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
           FROM categories c ORDER BY c.name COLLATE NOCASE ASC`,
      )
      .all();
    res.json({ categories: rows.map(shapeCategory) });
  }),
);

router.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const data = new Validator(req.body)
      .string('name', { min: 2, max: 60, label: 'Category name' })
      .string('description', { required: false, max: 300, label: 'Description' })
      .done();

    const slug = slugify(data.name);
    if (!slug) throw badRequest('Category name must contain letters or numbers');
    if (db.prepare('SELECT id FROM categories WHERE slug = ? OR name = ?').get(slug, data.name)) {
      throw new ApiError(409, 'That category already exists', { name: 'A category with this name already exists' });
    }
    const info = db
      .prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)')
      .run(data.name, slug, data.description || '');
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ category: shapeCategory(row) });
  }),
);

router.put(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'category id');
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) throw notFound('Category not found');

    const data = new Validator(req.body)
      .string('name', { min: 2, max: 60, label: 'Category name' })
      .string('description', { required: false, max: 300, label: 'Description' })
      .done();

    const slug = slugify(data.name);
    const clash = db
      .prepare('SELECT id FROM categories WHERE (slug = ? OR name = ?) AND id <> ?')
      .get(slug, data.name, id);
    if (clash) {
      throw new ApiError(409, 'That category name is already used', {
        name: 'A category with this name already exists',
      });
    }
    db.prepare('UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?').run(
      data.name,
      slug,
      data.description || '',
      id,
    );
    const row = db
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
           FROM categories c WHERE c.id = ?`,
      )
      .get(id);
    res.json({ category: shapeCategory(row) });
  }),
);

router.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'category id');
    const products = db.prepare('SELECT COUNT(*) AS c FROM products WHERE category_id = ?').get(id).c;
    if (products > 0) {
      throw badRequest(
        `Move or delete the ${products} product(s) in this category before removing it`,
      );
    }
    const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    if (info.changes === 0) throw notFound('Category not found');
    res.json({ ok: true, deletedId: id });
  }),
);

/* --------------------------------- orders -------------------------------- */

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const where = [];
    const params = {};
    if (status && ORDER_STATUSES.includes(status)) {
      where.push('o.status = @status');
      params.status = status;
    }
    if (search) {
      where.push('(u.name LIKE @search OR u.email LIKE @search OR CAST(o.id AS TEXT) = @searchId)');
      params.search = `%${search}%`;
      params.searchId = search;
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = db
      .prepare(
        `SELECT o.*, u.name AS customer_name, u.email AS customer_email
           FROM orders o JOIN users u ON u.id = o.user_id
           ${whereSql}
          ORDER BY o.created_at DESC, o.id DESC LIMIT 200`,
      )
      .all(params);
    res.json({ orders: rows.map((row) => shapeOrder(row, fetchOrderItems(row.id))) });
  }),
);

router.patch(
  '/orders/:id/status',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'order id');
    const data = new Validator(req.body)
      .enum('status', ORDER_STATUSES, { label: 'Order status' })
      .done();

    const existing = db.prepare('SELECT id FROM orders WHERE id = ?').get(id);
    if (!existing) throw notFound('Order not found');

    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
      data.status,
      id,
    );
    const row = db
      .prepare(
        `SELECT o.*, u.name AS customer_name, u.email AS customer_email
           FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`,
      )
      .get(id);
    res.json({ order: shapeOrder(row, fetchOrderItems(id)) });
  }),
);

/* ------------------------------- customers ------------------------------- */

router.get(
  '/customers',
  asyncHandler(async (_req, res) => {
    const rows = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, u.phone, u.city, u.country, u.created_at,
                (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
                (SELECT COALESCE(SUM(o.total_cents), 0) FROM orders o
                  WHERE o.user_id = u.id AND o.status <> 'cancelled') AS spent_cents
           FROM users u
          ORDER BY u.created_at DESC, u.id DESC`,
      )
      .all();
    res.json({
      customers: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        phone: row.phone || '',
        city: row.city || '',
        country: row.country || '',
        createdAt: row.created_at,
        orderCount: row.order_count,
        spentCents: row.spent_cents,
      })),
    });
  }),
);

export default router;
