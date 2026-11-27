# ShopSphere

A complete full-stack e-commerce store: React storefront, Express API, SQLite
database, cookie-based JWT authentication and a role-protected admin dashboard.

Everything is real — products, carts, orders and users live in a persistent
SQLite database, and every button in the UI calls a working API endpoint.

---

## Tech stack

| Layer      | Choice                                                     |
| ---------- | ---------------------------------------------------------- |
| Frontend   | React 19 + Vite, hand-written CSS (no UI framework)         |
| Routing    | Small in-house router (`src/lib/router.jsx`)                |
| Backend    | Node.js + Express 5                                         |
| Database   | SQLite via `better-sqlite3` (WAL, file-backed, persistent)  |
| Auth       | JWT in an httpOnly cookie, `bcryptjs` password hashing      |
| Validation | Declarative server-side `Validator` (`server/utils.js`)     |
| Tests      | `node:test` end-to-end API suite (`tests/api.test.js`)      |

---

## Quick start (local)

```bash
npm install          # install dependencies
npm run build        # build the React client into dist/
npm start            # start the server on http://localhost:3000
```

For development with hot reload (API + Vite together):

```bash
npm run dev          # API on :3000, Vite dev server proxies /api
```

The first start creates `data/shopsphere.db`, applies the schema and seeds
categories, products and the admin account.

### Demo accounts

| Role     | Email                   | Password      |
| -------- | ----------------------- | ------------- |
| Admin    | `admin@shopsphere.com`  | `Admin@12345` |
| Customer | register your own       | —             |

Change the admin credentials before a real launch with `ADMIN_EMAIL` and
`ADMIN_PASSWORD` (they are only applied when the admin account is first seeded).

---

## Environment variables

| Variable         | Default                  | Purpose                                            |
| ---------------- | ------------------------ | -------------------------------------------------- |
| `PORT`           | `3000`                   | HTTP port                                          |
| `HOST`           | `0.0.0.0`                | Bind address                                       |
| `DATA_DIR`       | `./data`                 | Directory for the SQLite file                      |
| `DB_FILE`        | `$DATA_DIR/shopsphere.db`| Explicit database path                             |
| `JWT_SECRET`     | dev fallback             | **Set in production** — signing key for sessions   |
| `COOKIE_SECURE`  | `false`                  | `true` behind HTTPS to mark cookies `Secure`       |
| `ADMIN_EMAIL`    | `admin@shopsphere.com`   | Seeded admin email                                 |
| `ADMIN_PASSWORD` | `Admin@12345`            | Seeded admin password                              |

---

## Features

### Customer

- Register / login / logout with hashed passwords and httpOnly cookie sessions.
- Browse products by category, search, price range, in-stock filter and sorting.
- Product detail pages with stock, rating and related products.
- Cart stored **in the database**, so it survives refreshes and new devices.
- Quantity steppers, item removal, clear cart, live subtotal/shipping/total.
- Checkout with shipping address and payment method; stock is decremented and
  the order is written in a single transaction.
- Order history and order detail with a status timeline.
- Profile editing (name, phone, address) and password change.

### Admin (`/admin`, role `admin` only)

- Dashboard: revenue, orders, customers, low-stock alerts, recent orders, top products.
- Create / edit / delete products (price, stock, category, image, featured).
- Create / edit / delete categories (blocked while products reference them).
- View every customer order, filter by status, update order status.
- View registered customers with order count and lifetime spend.

### Backend guarantees

- Every cart and order route requires authentication.
- Admin routes are guarded by `requireAdmin` (403 for customers, 401 anonymous).
- All input is validated on the server; errors return `{ error, fields }`.
- Prices are stored as integer cents; totals are recomputed server-side.
- Login has a basic brute-force throttle.

---

## API reference

Public:

| Method | Path                | Description                                    |
| ------ | ------------------- | ---------------------------------------------- |
| GET    | `/api/health`       | Health probe                                   |
| GET    | `/api/categories`   | Categories with product counts                 |
| GET    | `/api/products`     | List + `search, category, minPrice, maxPrice, inStock, featured, sort, page, limit` |
| GET    | `/api/products/:id` | Product detail + related products              |

Auth:

| Method | Path                  | Description                    |
| ------ | --------------------- | ------------------------------ |
| POST   | `/api/auth/register`  | Create account, sets session   |
| POST   | `/api/auth/login`     | Sign in, sets session          |
| POST   | `/api/auth/logout`    | Clear session                  |
| GET    | `/api/auth/me`        | Current user or `null`         |
| PATCH  | `/api/auth/profile`   | Update profile / password      |

Customer (auth required):

| Method | Path                       | Description                        |
| ------ | -------------------------- | ---------------------------------- |
| GET    | `/api/cart`                | Saved cart with totals             |
| POST   | `/api/cart`                | Add `{ productId, quantity }`      |
| PATCH  | `/api/cart/:productId`     | Set quantity                       |
| DELETE | `/api/cart/:productId`     | Remove item                        |
| DELETE | `/api/cart`                | Clear cart                         |
| POST   | `/api/cart/merge`          | Merge a guest cart after sign-in   |
| POST   | `/api/orders`              | Place order from the saved cart    |
| GET    | `/api/orders`              | Order history                      |
| GET    | `/api/orders/:id`          | Order detail (own orders only)     |

Admin (role `admin`):

| Method | Path                             | Description               |
| ------ | -------------------------------- | ------------------------- |
| GET    | `/api/admin/stats`               | Dashboard aggregates      |
| GET    | `/api/admin/products`            | All products + filters    |
| POST   | `/api/admin/products`            | Create product            |
| PUT    | `/api/admin/products/:id`        | Update product            |
| DELETE | `/api/admin/products/:id`        | Delete product            |
| GET    | `/api/admin/categories`          | Categories                |
| POST   | `/api/admin/categories`          | Create category           |
| PUT    | `/api/admin/categories/:id`      | Update category           |
| DELETE | `/api/admin/categories/:id`      | Delete category           |
| GET    | `/api/admin/orders`              | All orders (`?status=`)   |
| PATCH  | `/api/admin/orders/:id/status`   | Update order status       |
| GET    | `/api/admin/customers`           | Registered customers      |

---

## Project structure

```
server/
  app.js            Express app factory (API + static client + error handler)
  index.js          Production entry (listens on PORT)
  dev.js            Runs API and Vite together
  db.js             SQLite schema, migrations and seed data
  auth.js           Hashing, JWT, cookies, requireAuth / requireAdmin
  utils.js          ApiError, Validator, slugify, helpers
  routes/
    auth.js  catalog.js  cart.js  orders.js  admin.js
src/
  App.jsx           Routes + providers
  lib/              api client, router, formatters
  state/            Auth, Cart, Toast contexts
  components/       Navbar, Footer, ProductCard, ui kit, icons
  pages/            Home, Shop, ProductDetail, Cart, Checkout, Login,
                    Register, Orders, OrderDetail, Profile, NotFound
  pages/admin/      AdminLayout, Dashboard, Products, Categories, Orders, Customers
tests/api.test.js   End-to-end API tests (17 cases)
data/               SQLite database (created at runtime)
```

---

## Testing

```bash
npm test
```

The suite boots the real Express app against a temporary SQLite database and
covers:

1. Health check and seeded catalog.
2. Search, category and price filters, product detail, 404s.
3. Registration validation, duplicate email, session creation.
4. Login success/failure, `/me`, logout.
5. Cart auth guard, add/update/remove/clear, persistence across requests.
6. Checkout validation, order creation, cart clearing, stock decrement.
7. Order history scoping (customers cannot read others' orders).
8. Profile validation and persistence.
9. Admin route protection (401 anonymous, 403 customer).
10. Admin product/category CRUD and deletion guards.
11. Admin order listing, status updates, customer list.

```bash
npm run build        # production client bundle
```

---

## Deployment

The repository ships a production `Dockerfile` (multi-stage, Alpine, non-root).

```bash
docker build -t shopsphere .
docker run -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e COOKIE_SECURE=true \
  -v shopsphere-data:/app/data \
  shopsphere
```

Notes:

- Mount a volume at `/app/data` so the SQLite database survives redeploys.
- Set a strong `JWT_SECRET`; `COOKIE_SECURE=true` when served over HTTPS.
- The container serves the built client and the API from the same origin on
  `0.0.0.0:$PORT`.

### Deploying to AppJet

Use the AppJet deploy action for this project; it builds the Docker image and
serves the app on a public URL. Add `JWT_SECRET` (and optionally
`ADMIN_EMAIL` / `ADMIN_PASSWORD`) in **Settings → Environment variables**.
On the Free plan the filesystem is ephemeral, so the SQLite database is
re-seeded on each deploy; attach a persistent disk (Starter plan) for durable
data across deploys.
