/**
 * End-to-end API tests for ShopSphere.
 *
 * Runs the real Express app against a throwaway SQLite database and exercises
 * registration, login, catalog browsing, cart persistence, checkout, order
 * history, profile updates, admin CRUD and role-based authorization.
 *
 * Run with: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shopsphere-test-'));
process.env.DB_FILE = path.join(tmpDir, 'shopsphere-test.db');
process.env.JWT_SECRET = 'test-secret-not-used-in-production';
process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@shopsphere.com';
process.env.ADMIN_PASSWORD = 'Admin@12345';

const { createApp } = await import('../server/app.js');

const app = createApp();
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;

/** Minimal cookie-aware HTTP client so sessions behave like a browser. */
function makeClient() {
  const cookies = new Map();
  async function call(method, pathname, body) {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (cookies.size) {
      headers.cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
    }
    const res = await fetch(base + pathname, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const raw = res.headers.getSetCookie
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie')].filter(Boolean);
    for (const entry of raw) {
      const pair = entry.split(';')[0];
      const index = pair.indexOf('=');
      if (index <= 0) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      // An empty value means the server cleared the cookie (logout).
      if (value) cookies.set(name, value);
      else cookies.delete(name);
    }
    const text = await res.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
    }
    return { status: res.status, body: json };
  }
  return {
    get: (p) => call('GET', p),
    post: (p, b) => call('POST', p, b),
    patch: (p, b) => call('PATCH', p, b),
    put: (p, b) => call('PUT', p, b),
    del: (p, b) => call('DELETE', p, b),
  };
}

const guest = makeClient();
const alice = makeClient();
const bob = makeClient();
const admin = makeClient();

const aliceEmail = `alice-${Date.now()}@example.com`;
const bobEmail = `bob-${Date.now()}@example.com`;
const password = 'S3curePass!';

let sampleProduct = null;
let placedOrder = null;
let createdCategoryId = null;
let createdProductId = null;

test('health endpoint reports ok', async () => {
  const res = await guest.get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.ok, true);
  assert.equal(res.body.service, 'shopsphere');
});

test('seeded catalog exposes categories and products', async () => {
  const categories = await guest.get('/api/categories');
  assert.equal(categories.status, 200);
  assert.ok(Array.isArray(categories.body.categories));
  assert.ok(categories.body.categories.length >= 3, 'expected seeded categories');
  assert.equal(typeof categories.body.categories[0].productCount, 'number');

  const products = await guest.get('/api/products');
  assert.equal(products.status, 200);
  assert.ok(products.body.products.length > 0, 'expected seeded products');
  assert.ok(products.body.total > 0);
  assert.equal(typeof products.body.products[0].priceCents, 'number');
  assert.equal(typeof products.body.products[0].stock, 'number');

  sampleProduct = products.body.products.find((p) => p.stock > 3);
  assert.ok(sampleProduct, 'expected an in-stock seeded product');
});

test('search, category filter and price range narrow the listing', async () => {
  const term = sampleProduct.name.split(' ')[0];
  const search = await guest.get(`/api/products?search=${encodeURIComponent(term)}`);
  assert.equal(search.status, 200);
  assert.ok(search.body.products.length >= 1);
  assert.ok(
    search.body.products.every((p) => p.name.toLowerCase().includes(term.toLowerCase())),
    'search results must match the query',
  );

  const slug = sampleProduct.category.slug;
  const byCategory = await guest.get(`/api/products?category=${slug}`);
  assert.equal(byCategory.status, 200);
  assert.ok(byCategory.body.products.length >= 1);
  assert.ok(byCategory.body.products.every((p) => p.category.slug === slug));

  const priced = await guest.get('/api/products?minPrice=10&maxPrice=200&sort=price_asc');
  assert.equal(priced.status, 200);
  assert.ok(priced.body.products.length >= 1);
  for (const product of priced.body.products) {
    assert.ok(product.priceCents >= 1000 && product.priceCents <= 20000);
  }
  const prices = priced.body.products.map((p) => p.priceCents);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b), 'sort=price_asc must be ascending');

  const detail = await guest.get(`/api/products/${sampleProduct.id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.product.id, sampleProduct.id);
  assert.ok(Array.isArray(detail.body.related));

  const missing = await guest.get('/api/products/999999');
  assert.equal(missing.status, 404);
});

test('registration validates input and creates a customer session', async () => {
  const invalid = await guest.post('/api/auth/register', {
    name: 'A',
    email: 'not-an-email',
    password: 'short',
  });
  assert.equal(invalid.status, 422);
  assert.ok(invalid.body.fields, 'expected field-level validation errors');
  assert.ok(invalid.body.fields.email, 'email should be flagged');
  assert.ok(invalid.body.fields.password, 'password should be flagged');

  const created = await alice.post('/api/auth/register', {
    name: 'Alice Customer',
    email: aliceEmail,
    password,
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.user.email, aliceEmail);
  assert.equal(created.body.user.role, 'customer');
  assert.ok(!('password_hash' in created.body.user), 'password hash must never be returned');

  const me = await alice.get('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, aliceEmail);

  const duplicate = await guest.post('/api/auth/register', {
    name: 'Alice Clone',
    email: aliceEmail,
    password,
  });
  assert.equal(duplicate.status, 409);
});

test('login rejects bad credentials and accepts correct ones', async () => {
  const wrong = await guest.post('/api/auth/login', { email: aliceEmail, password: 'wrong-password' });
  assert.equal(wrong.status, 401);

  const ok = await bob.post('/api/auth/login', { email: aliceEmail, password });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.email, aliceEmail);

  const session = await bob.get('/api/auth/me');
  assert.equal(session.body.user.email, aliceEmail);
});

test('cart endpoints require authentication', async () => {
  const res = await guest.get('/api/cart');
  assert.equal(res.status, 401);

  const add = await guest.post('/api/cart', { productId: sampleProduct.id, quantity: 1 });
  assert.equal(add.status, 401);
});

test('cart persists on the server and quantities can be adjusted', async () => {
  const added = await alice.post('/api/cart', { productId: sampleProduct.id, quantity: 2 });
  assert.equal(added.status, 201);
  assert.equal(added.body.cart.items.length, 1);
  assert.equal(added.body.cart.items[0].quantity, 2);
  assert.equal(added.body.cart.count, 2);
  assert.equal(added.body.cart.subtotalCents, sampleProduct.priceCents * 2);

  // A fresh request (page refresh) still sees the saved cart.
  const reread = await alice.get('/api/cart');
  assert.equal(reread.body.cart.items[0].quantity, 2);

  const increased = await alice.patch(`/api/cart/${sampleProduct.id}`, { quantity: 3 });
  assert.equal(increased.status, 200);
  assert.equal(increased.body.cart.items[0].quantity, 3);
  assert.equal(increased.body.cart.subtotalCents, sampleProduct.priceCents * 3);

  const decreased = await alice.patch(`/api/cart/${sampleProduct.id}`, { quantity: 1 });
  assert.equal(decreased.body.cart.items[0].quantity, 1);

  const badQuantity = await alice.patch(`/api/cart/${sampleProduct.id}`, { quantity: 0 });
  assert.equal(badQuantity.status, 422);

  const unknownProduct = await alice.post('/api/cart', { productId: 999999, quantity: 1 });
  assert.equal(unknownProduct.status, 404);

  const cleared = await alice.del('/api/cart');
  assert.equal(cleared.status, 200);
  assert.equal(cleared.body.cart.items.length, 0);
});

test('orders require a non-empty cart and valid shipping details', async () => {
  const emptyCart = await alice.post('/api/orders', {
    name: 'Alice Customer',
    address: '12 Market Street',
    city: 'Austin',
    zip: '73301',
    country: 'USA',
  });
  assert.equal(emptyCart.status, 400);

  await alice.post('/api/cart', { productId: sampleProduct.id, quantity: 2 });

  const invalid = await alice.post('/api/orders', {
    name: 'A',
    address: '',
    city: '',
    zip: '',
    country: '',
  });
  assert.equal(invalid.status, 422);
});

test('placing an order stores it, clears the cart and reduces stock', async () => {
  const before = await guest.get(`/api/products/${sampleProduct.id}`);
  const stockBefore = before.body.product.stock;

  const res = await alice.post('/api/orders', {
    name: 'Alice Customer',
    address: '12 Market Street',
    city: 'Austin',
    zip: '73301',
    country: 'USA',
    phone: '+1 555 0100',
    paymentMethod: 'cod',
  });
  assert.equal(res.status, 201);

  const order = res.body.order;
  assert.equal(order.status, 'pending');
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].quantity, 2);
  assert.equal(order.totalCents, order.subtotalCents + order.shippingCents);
  assert.equal(order.shipping.city, 'Austin');
  assert.equal(order.paymentMethod, 'cod');

  const cart = await alice.get('/api/cart');
  assert.equal(cart.body.cart.items.length, 0, 'cart is emptied after checkout');

  const after = await guest.get(`/api/products/${sampleProduct.id}`);
  assert.equal(after.body.product.stock, stockBefore - 2, 'stock is decremented');

  placedOrder = order;
});

test('order history is scoped to the signed-in customer', async () => {
  const list = await alice.get('/api/orders');
  assert.equal(list.status, 200);
  assert.equal(list.body.orders.length, 1);
  assert.equal(list.body.orders[0].id, placedOrder.id);

  const detail = await alice.get(`/api/orders/${placedOrder.id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.order.id, placedOrder.id);

  // A second customer may not read someone else's order.
  await bob.post('/api/auth/register', {
    name: 'Bob Buyer',
    email: bobEmail,
    password,
  });
  const foreign = await bob.get(`/api/orders/${placedOrder.id}`);
  assert.equal(foreign.status, 403);

  const bobOrders = await bob.get('/api/orders');
  assert.equal(bobOrders.body.orders.length, 0);
});

test('profile updates are validated and persisted', async () => {
  const invalid = await alice.patch('/api/auth/profile', { name: 'A' });
  assert.equal(invalid.status, 422);

  const updated = await alice.patch('/api/auth/profile', {
    name: 'Alice B. Customer',
    phone: '+1 555 0111',
    address: '12 Market Street',
    city: 'Austin',
    zip: '73301',
    country: 'USA',
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.user.name, 'Alice B. Customer');

  const me = await alice.get('/api/auth/me');
  assert.equal(me.body.user.name, 'Alice B. Customer');
  assert.equal(me.body.user.city, 'Austin');
});

test('admin routes reject customers and anonymous visitors', async () => {
  const anonymous = await guest.get('/api/admin/stats');
  assert.equal(anonymous.status, 401);

  const asCustomer = await alice.get('/api/admin/stats');
  assert.equal(asCustomer.status, 403);

  const writeAttempt = await alice.post('/api/admin/products', {
    name: 'Hacked Product',
    price: 1,
    stock: 1,
    categoryId: 1,
  });
  assert.equal(writeAttempt.status, 403);
});

test('admin can sign in and read dashboard data', async () => {
  const login = await admin.post('/api/auth/login', {
    email: 'admin@shopsphere.com',
    password: 'Admin@12345',
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, 'admin');

  const stats = await admin.get('/api/admin/stats');
  assert.equal(stats.status, 200);
  assert.equal(typeof stats.body.stats.revenueCents, 'number');
  assert.ok(stats.body.stats.revenueCents >= placedOrder.totalCents);
});

test('admin product CRUD works end to end', async () => {
  const category = await admin.post('/api/admin/categories', {
    name: `Test Gadgets ${Date.now()}`,
    description: 'Created by the automated test suite',
  });
  assert.equal(category.status, 201);
  createdCategoryId = category.body.category.id;

  const invalid = await admin.post('/api/admin/products', {
    name: 'Broken Product',
    price: 0,
    stock: -2,
    categoryId: createdCategoryId,
  });
  assert.equal(invalid.status, 422);

  const created = await admin.post('/api/admin/products', {
    name: 'Test Widget',
    description: 'A widget used by the tests',
    price: 19.99,
    stock: 5,
    categoryId: createdCategoryId,
    featured: 1,
  });
  assert.equal(created.status, 201);
  createdProductId = created.body.product.id;
  assert.equal(created.body.product.priceCents, 1999);
  assert.equal(created.body.product.category.id, createdCategoryId);

  const listed = await admin.get('/api/admin/products?search=Test Widget');
  assert.ok(listed.body.products.some((p) => p.id === createdProductId));

  const visible = await guest.get(`/api/products/${createdProductId}`);
  assert.equal(visible.status, 200, 'new product appears in the public catalog');

  const updated = await admin.put(`/api/admin/products/${createdProductId}`, {
    name: 'Test Widget Pro',
    price: 24.5,
    stock: 7,
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.product.name, 'Test Widget Pro');
  assert.equal(updated.body.product.priceCents, 2450);
  assert.equal(updated.body.product.stock, 7);

  // A category that still holds products cannot be removed.
  const blockedDelete = await admin.del(`/api/admin/categories/${createdCategoryId}`);
  assert.equal(blockedDelete.status, 400);

  const deleted = await admin.del(`/api/admin/products/${createdProductId}`);
  assert.equal(deleted.status, 200);
  assert.equal((await guest.get(`/api/products/${createdProductId}`)).status, 404);

  const removedCategory = await admin.del(`/api/admin/categories/${createdCategoryId}`);
  assert.equal(removedCategory.status, 200);
  createdCategoryId = null;
  createdProductId = null;
});

test('admin sees all orders and can move them through statuses', async () => {
  const orders = await admin.get('/api/admin/orders');
  assert.equal(orders.status, 200);
  assert.ok(orders.body.orders.some((o) => o.id === placedOrder.id));

  const invalid = await admin.patch(`/api/admin/orders/${placedOrder.id}/status`, {
    status: 'teleported',
  });
  assert.equal(invalid.status, 422);

  const shipped = await admin.patch(`/api/admin/orders/${placedOrder.id}/status`, {
    status: 'shipped',
  });
  assert.equal(shipped.status, 200);
  assert.equal(shipped.body.order.status, 'shipped');

  const customerView = await alice.get(`/api/orders/${placedOrder.id}`);
  assert.equal(customerView.body.order.status, 'shipped', 'customer sees the updated status');

  const filtered = await admin.get('/api/admin/orders?status=shipped');
  assert.ok(filtered.body.orders.every((o) => o.status === 'shipped'));
});

test('admin customer list includes registered shoppers', async () => {
  const res = await admin.get('/api/admin/customers');
  assert.equal(res.status, 200);
  const emails = res.body.customers.map((c) => c.email);
  assert.ok(emails.includes(aliceEmail));
  assert.ok(emails.includes(bobEmail));
  assert.ok(!emails.includes('admin@shopsphere.com'), 'admins are not listed as customers');
});

test('logout clears the session', async () => {
  const res = await bob.post('/api/auth/logout');
  assert.equal(res.status, 200);

  const me = await bob.get('/api/auth/me');
  assert.equal(me.body.user, null);
});

test.after(() => {
  server.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
