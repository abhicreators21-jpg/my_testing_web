import { createApp } from './app.js';
import { DB_FILE } from './db.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`ShopSphere server listening on http://${HOST}:${PORT}`);
  console.log(`SQLite database: ${DB_FILE}`);
});
