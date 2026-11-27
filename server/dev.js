/**
 * Development helper: runs the API server and the Vite dev server together.
 * The Vite dev server proxies /api to the Express server on port 3000.
 */
import { spawn } from 'node:child_process';

const children = [];

function start(command, args, name) {
  const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) console.log(`[${name}] exited with code ${code}`);
    shutdown();
  });
  children.push(child);
  return child;
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});

console.log('Starting ShopSphere API on http://127.0.0.1:3000 and Vite on http://127.0.0.1:5173');
start(process.execPath, ['--watch', 'server/index.js'], 'api');
start(process.execPath, ['node_modules/vite/bin/vite.js'], 'client');
