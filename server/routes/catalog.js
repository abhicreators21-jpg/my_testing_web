/** Public catalog routes: categories, product listing with search/filter/sort, product detail. */
import { Router } from 'express';
import { db } from '../db.js';
import { asyncHandler, notFound, parseId } from '../utils.js';

const router = Router();

const SORTS = {
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price_cents ASC, p.id ASC',
  price_desc: 'p.price_cents DESC, p.id DESC',
  name: 'p.name COLLATE NOCASE ASC',
  rating: 'p.rating DESC, p.review_count DESC',
};

const PRODUCT_SELECT = `
  SELECT p.id, p.name, p.description, p.price_cents, p.stock, p.image_url,
         p.rating, p.review_count, p.featured, p.created_at,
         c.id AS category_id, c.name AS category_name, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
`;

export function shapeProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    price: row.price_cents / 100,
    stock: row.stock,
    imageUrl: row.image_url,
    rating: row.rating,
    reviewCount: row.review_count,
    featured: Boolean(row.featured),
    createdAt: row.created_at,
    category: row.category_id
      ? { id: row.category_id, name: row.category_name, slug: row.category_slug }
      : null,
  };
}

export function shapeCategory(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    productCount: row.product_count ?? 0,
  };
}

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const rows = db
      .prepare(
        `SELECT c.id, c.name, c.slug, c.description,
                (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
           FROM categories c
          ORDER BY c.name COLLATE NOCASE ASC`,
      )
      .all();
    res.json({ categories: rows.map(shapeCategory) });
  }),
);

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const where = [];
    const params = {};

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (search) {
      where.push('(p.name LIKE @search OR p.description LIKE @search OR c.name LIKE @search)');
      params.search = `%${search}%`;
    }

    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    if (category && category !== 'all') {
      where.push('(c.slug = @category OR CAST(c.id AS TEXT) = @category)');
      params.category = category;
    }

    const minPrice = Number(req.query.minPrice);
    if (Number.isFinite(minPrice) && minPrice > 0) {
      where.push('p.price_cents >= @minCents');
      params.minCents = Math.round(minPrice * 100);
    }

    const maxPrice = Number(req.query.maxPrice);
    if (Number.isFinite(maxPrice) && maxPrice > 0) {
      where.push('p.price_cents <= @maxCents');
      params.maxCents = Math.round(maxPrice * 100);
    }

    if (req.query.inStock === 'true') {
      where.push('p.stock > 0');
    }
    if (req.query.featured === 'true') {
      where.push('p.featured = 1');
    }

    const sortKey = typeof req.query.sort === 'string' && SORTS[req.query.sort] ? req.query.sort : 'newest';
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 60);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = db
      .prepare(
        `SELECT COUNT(*) AS c FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`,
      )
      .get(params).c;

    const rows = db
      .prepare(`${PRODUCT_SELECT} ${whereSql} ORDER BY ${SORTS[sortKey]} LIMIT @limit OFFSET @offset`)
      .all({ ...params, limit, offset });

    res.json({
      products: rows.map(shapeProduct),
      total,
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
      limit,
      sort: sortKey,
    });
  }),
);

router.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'product id');
    const row = db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(id);
    if (!row) throw notFound('Product not found');

    const related = db
      .prepare(
        `${PRODUCT_SELECT}
          WHERE p.category_id = ? AND p.id <> ?
          ORDER BY p.rating DESC LIMIT 4`,
      )
      .all(row.category_id, id);

    res.json({ product: shapeProduct(row), related: related.map(shapeProduct) });
  }),
);

export default router;
