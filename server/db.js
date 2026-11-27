/**
 * ShopSphere database layer.
 * A real SQLite database file (better-sqlite3) with schema migrations and seed data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR =
  process.env.DATA_DIR || path.join(__dirname, '..', 'data');
export const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'shopsphere.db');

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

export const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  phone TEXT,
  address TEXT,
  city TEXT,
  zip TEXT,
  country TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  rating REAL NOT NULL DEFAULT 4.5,
  review_count INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'card',
  shipping_name TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_zip TEXT NOT NULL,
  shipping_country TEXT NOT NULL,
  shipping_phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  image_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`;

db.exec(SCHEMA);

const IMG = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;

const CATEGORY_SEED = [
  ['Audio', 'audio', 'Headphones, earbuds and speakers tuned for everyday listening.'],
  ['Wearables', 'wearables', 'Smart watches, fitness bands and connected accessories.'],
  ['Computers', 'computers', 'Laptops, monitors and desk peripherals built for work.'],
  ['Photography', 'photography', 'Cameras, lenses and gear for creators on the move.'],
  ['Home & Living', 'home-living', 'Furniture, lighting and kitchen essentials.'],
  ['Accessories', 'accessories', 'Bags, sunglasses and the small things that matter.'],
];

const PRODUCT_SEED = [
  ['Aurora Wireless Headphones', 'audio', 24900, 24, IMG('photo-1505740420928-5e560c06d30e'), 4.8, 214, 1,
    'Adaptive noise cancelling over-ear headphones with 40 hours of battery life and plush memory-foam cups.'],
  ['Pulse Mini Earbuds', 'audio', 8900, 60, IMG('photo-1590658268037-6bf12165a8df'), 4.5, 412, 1,
    'Pocket-sized true wireless earbuds with touch controls, IPX5 water resistance and a compact charging case.'],
  ['Nebula Bluetooth Speaker', 'audio', 12900, 38, IMG('photo-1608043152269-423dbba4e7e1'), 4.6, 168, 0,
    '360° room-filling sound in a rugged, waterproof shell. Twelve hours of playback per charge.'],
  ['Orbit Smartwatch Pro', 'wearables', 19900, 31, IMG('photo-1523275335684-37898b6baf30'), 4.7, 289, 1,
    'AMOLED smartwatch with GPS, heart-rate and sleep tracking, plus a seven-day battery.'],
  ['Vector Fitness Band', 'wearables', 6900, 74, IMG('photo-1575311373937-040b8e1fd5b6'), 4.3, 523, 0,
    'Slim activity tracker with 14 workout modes, SpO2 sensing and two weeks of battery life.'],
  ['Pulse Smart Ring', 'wearables', 27900, 18, IMG('photo-1605100804763-247f67b3557e'), 4.4, 96, 0,
    'Titanium smart ring that tracks recovery, temperature and readiness without a screen.'],
  ['Zenith Ultrabook 14', 'computers', 129900, 12, IMG('photo-1496181133206-80ce9b88a853'), 4.9, 143, 1,
    '14-inch ultrabook with a 2.8K display, 16GB RAM, 1TB SSD and 18 hours of real-world battery.'],
  ['Vertex Mechanical Keyboard', 'computers', 14900, 45, IMG('photo-1587829741301-dc798b83add3'), 4.6, 331, 0,
    'Hot-swappable 75% mechanical keyboard with tactile switches and per-key RGB lighting.'],
  ['Glide Wireless Mouse', 'computers', 5900, 88, IMG('photo-1527864550417-7fd91fc51a46'), 4.4, 274, 0,
    'Ergonomic 8K polling wireless mouse with silent switches and 70-day battery life.'],
  ['Canvas 27 4K Monitor', 'computers', 49900, 16, IMG('photo-1527443224154-c4a3942d3acf'), 4.7, 118, 0,
    '27-inch 4K IPS monitor with 99% sRGB coverage, USB-C power delivery and a height-adjustable stand.'],
  ['Lumen Mirrorless Camera', 'photography', 89900, 9, IMG('photo-1516035069371-29a1b244cc32'), 4.8, 87, 1,
    '26MP APS-C mirrorless body with in-body stabilisation, 4K60 video and dual card slots.'],
  ['Aperture 35mm Prime Lens', 'photography', 34900, 21, IMG('photo-1516724562728-afc824a36e84'), 4.9, 64, 0,
    'Fast f/1.4 prime lens with creamy bokeh and a weather-sealed metal barrel.'],
  ['Trail Action Camera', 'photography', 22900, 27, IMG('photo-1502920917128-1aa500764cbd'), 4.5, 152, 0,
    'Rugged 5.3K action camera with horizon lock, voice control and waterproof housing.'],
  ['Nordic Oak Lounge Chair', 'home-living', 44900, 7, IMG('photo-1586023492125-27b2c045efd7'), 4.6, 41, 1,
    'Solid oak lounge chair with a woven seat and a sculpted backrest that ages beautifully.'],
  ['Halo Desk Lamp', 'home-living', 7900, 52, IMG('photo-1507473885765-e6ed057f782c'), 4.4, 133, 0,
    'Dimmable LED desk lamp with adjustable colour temperature and a wireless charging base.'],
  ['Ceramic Pour-Over Set', 'home-living', 5900, 64, IMG('photo-1495474472287-4d71bcdd2085'), 4.7, 208, 0,
    'Hand-glazed ceramic dripper and carafe set for a slower, better morning coffee.'],
  ['Terra Cotton Throw', 'home-living', 4900, 40, IMG('photo-1584100936595-c0654b55a2e2'), 4.3, 77, 0,
    'Stonewashed organic cotton throw, woven in Portugal and soft enough for year-round use.'],
  ['Metro Leather Backpack', 'accessories', 15900, 34, IMG('photo-1553062407-98eeb64c6a62'), 4.6, 189, 1,
    'Full-grain leather backpack with a padded 16-inch laptop sleeve and lifetime hardware warranty.'],
  ['Solstice Sunglasses', 'accessories', 11900, 47, IMG('photo-1511499767150-a48a237f0083'), 4.4, 102, 0,
    'Polarised acetate sunglasses with a lightweight frame and full UV400 protection.'],
  ['Pulse Wireless Charger', 'accessories', 3900, 96, IMG('photo-1585123334904-845d60e97b29'), 4.2, 361, 0,
    '15W Qi2 wireless charging pad with a machined aluminium body and non-slip base.'],
];

export function seedDatabase(hashPassword) {
  const hasher = hashPassword;

  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const insertUser = db.prepare(
      `INSERT INTO users (name, email, password_hash, role, phone, address, city, zip, country)
       VALUES (@name, @email, @password_hash, @role, @phone, @address, @city, @zip, @country)`,
    );
    insertUser.run({
      name: 'Store Admin',
      email: (process.env.ADMIN_EMAIL || 'admin@shopsphere.com').toLowerCase(),
      password_hash: hasher(process.env.ADMIN_PASSWORD || 'Admin@12345'),
      role: 'admin',
      phone: '+1 415 555 0100',
      address: '1 Market Street',
      city: 'San Francisco',
      zip: '94103',
      country: 'United States',
    });
    insertUser.run({
      name: 'Demo Customer',
      email: 'demo@shopsphere.com',
      password_hash: hasher('Demo@12345'),
      role: 'customer',
      phone: '+1 415 555 0111',
      address: '220 Valencia Street',
      city: 'San Francisco',
      zip: '94103',
      country: 'United States',
    });
  }

  const categoryCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
  if (categoryCount === 0) {
    const insertCategory = db.prepare(
      'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
    );
    for (const [name, slug, description] of CATEGORY_SEED) {
      insertCategory.run(name, slug, description);
    }
  }

  const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  if (productCount === 0) {
    const insertProduct = db.prepare(
      `INSERT INTO products (name, category_id, price_cents, stock, image_url, rating, review_count, featured, description)
       VALUES (@name, (SELECT id FROM categories WHERE slug = @slug), @price_cents, @stock, @image_url, @rating, @review_count, @featured, @description)`,
    );
    const seedAll = db.transaction(() => {
      for (const [name, slug, price, stock, image, rating, reviews, featured, description] of PRODUCT_SEED) {
        insertProduct.run({
          name,
          slug,
          price_cents: price,
          stock,
          image_url: image,
          rating,
          review_count: reviews,
          featured,
          description,
        });
      }
    });
    seedAll();
  }

  // A sample order so the admin dashboard is not empty on a fresh install.
  const orderCount = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  if (orderCount === 0) {
    const demo = db.prepare("SELECT id FROM users WHERE email = 'demo@shopsphere.com'").get();
    const items = db
      .prepare('SELECT id, name, price_cents, image_url FROM products ORDER BY id LIMIT 2')
      .all();
    if (demo && items.length) {
      const subtotal = items.reduce((sum, item) => sum + item.price_cents, 0);
      const shipping = subtotal >= 5000 ? 0 : 499;
      const createOrder = db.transaction(() => {
        const info = db
          .prepare(
            `INSERT INTO orders (user_id, status, subtotal_cents, shipping_cents, total_cents, payment_method,
              shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country, shipping_phone)
             VALUES (?, 'shipped', ?, ?, ?, 'card', 'Demo Customer', '220 Valencia Street', 'San Francisco', '94103', 'United States', '+1 415 555 0111')`,
          )
          .run(demo.id, subtotal, shipping, subtotal + shipping);
        const insertItem = db.prepare(
          `INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity, image_url)
           VALUES (?, ?, ?, ?, 1, ?)`,
        );
        for (const item of items) {
          insertItem.run(info.lastInsertRowid, item.id, item.name, item.price_cents, item.image_url);
        }
      });
      createOrder();
    }
  }
}

export function initDatabase(hashPassword) {
  seedDatabase(hashPassword);
}
