/** Express application: JSON API under /api plus the built React client. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';

import { initDatabase, DB_FILE } from './db.js';
import { hashPassword, attachUser } from './auth.js';
import { ApiError } from './utils.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

initDatabase(hashPassword);

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Attach the signed-in user to every API request.
  app.use('/api', attachUser);

  // Health probe. `status` is the documented contract field; `ok` is kept as an alias.
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      ok: true,
      service: 'shopsphere',
      database: path.basename(DB_FILE),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api', catalogRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', adminRoutes);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Serve the built client (production) with a history-API fallback.
  const distDir = path.join(ROOT, 'dist');
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res
        .status(200)
        .type('html')
        .send(
          '<h1>ShopSphere API is running</h1><p>The client bundle is not built yet. Run <code>npm run build</code> and restart, or use <code>npm run dev</code>.</p>',
        );
    });
  }

  // Central error handler.
  app.use((err, req, res, _next) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ error: err.message, fields: err.details || undefined });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body must be valid JSON' });
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large' });
    }
    console.error('[api] unhandled error', err);
    return res.status(500).json({ error: 'Something went wrong on our side' });
  });

  return app;
}

export default createApp;
