import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 4174;
const base = `http://127.0.0.1:${port}`;
let server;

before(async () => {
  server = spawn(process.execPath, ['scripts/serve.mjs'], {
    cwd: root,
    env: { ...process.env, UAA_SERVE_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for local server')), 5_000);
    server.stdout.on('data', chunk => {
      if (chunk.toString().includes(`127.0.0.1:${port}`)) { clearTimeout(timer); resolve(); }
    });
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`Server exited before startup: ${code}`)));
  });
});

after(() => server?.kill());

test('static browser boundary is local-only and allowlisted', async () => {
  const page = await fetch(`${base}/`);
  assert.equal(page.status, 200);
  const csp = page.headers.get('content-security-policy');
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /connect-src 'none'/);
  assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(page.headers.get('x-content-type-options'), 'nosniff');

  const html = await page.text();
  for (const api of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon']) assert.doesNotMatch(html, new RegExp(api.replace('(', '\\(')));
  assert.match(html, /FileReader|\.files/);

  assert.equal((await fetch(`${base}/dist/core.js`)).status, 200);
  assert.equal((await fetch(`${base}/web/browser-input.mjs`)).status, 200);
  assert.equal((await fetch(`${base}/package.json`)).status, 404);
  assert.equal((await fetch(`${base}/%2e%2e/.env`)).status, 404);
  assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
});
