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
  assert.match(csp, /script-src 'self' 'sha256-jtV2FIxy4X2wtE23A0izgYxYGKh5FcEOmeZVzTccf0E='/);
  assert.match(csp, /connect-src 'none'/);
  assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(page.headers.get('x-content-type-options'), 'nosniff');

  const html = await page.text();
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  assert.match(html, /connect-src 'none'/);
  for (const id of ['files', 'files-fallback', 'zip', 'target', 'security', 'ast', 'review', 'run', 'export', 'status', 'output']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /ローカルでプロジェクトの構成を確認し/);
  assert.match(html, /解析結果はここに表示されます/);
  for (const api of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon']) assert.doesNotMatch(html, new RegExp(api.replace('(', '\\(')));
  assert.doesNotMatch(html, /<script type="module">/);
  assert.match(html, /importmap/);
  const app = await fetch(`${base}/web/app.mjs`);
  assert.equal(app.status, 200);
  assert.match(await app.text(), /\.files/);

  assert.equal((await fetch(`${base}/dist/core.js`)).status, 200);
  assert.equal((await fetch(`${base}/dist/ast-analyzer.js`)).status, 200);
  assert.equal((await fetch(`${base}/web/app.mjs`)).status, 200);
  assert.equal((await fetch(`${base}/web/browser-input.mjs`)).status, 200);
  assert.equal((await fetch(`${base}/web/browser-zip.mjs`)).status, 200);
  for (const asset of [
    '/web/vendor/web-tree-sitter.js',
    '/web/vendor/web-tree-sitter.wasm',
    '/web/vendor/tree-sitter-python.wasm',
    '/web/vendor/tree-sitter-typescript.wasm',
  ]) assert.equal((await fetch(`${base}${asset}`)).status, 200);
  assert.equal((await fetch(`${base}/package.json`)).status, 404);
  assert.equal((await fetch(`${base}/web/vendor/package.json`)).status, 404);
  assert.equal((await fetch(`${base}/%2e%2e/.env`)).status, 404);
  assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
});
