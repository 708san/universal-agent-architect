/** Minimal localhost-only server for the static browser prototype, not an MCP server. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const port = Number(process.env.UAA_SERVE_PORT ?? 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { allow: 'GET, HEAD' }).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  const file = path.resolve(root, `.${pathname === '/' ? '/web/index.html' : pathname}`);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  const allowed = new Set(['/web/index.html', '/web/app.mjs', '/web/browser-input.mjs', '/web/browser-zip.mjs', '/dist/core.js', '/dist/ast-analyzer.js',
    '/web/vendor/web-tree-sitter.js', '/web/vendor/web-tree-sitter.wasm', '/web/vendor/tree-sitter-python.wasm', '/web/vendor/tree-sitter-typescript.wasm']);
  if (!allowed.has(pathname === '/' ? '/web/index.html' : pathname)) { res.writeHead(404).end(); return; }
  try {
    const content = await readFile(file);
    res.writeHead(200, {
      'content-type': mime[path.extname(file)] ?? 'application/octet-stream',
      'content-security-policy': "default-src 'none'; script-src 'self' 'sha256-jtV2FIxy4X2wtE23A0izgYxYGKh5FcEOmeZVzTccf0E='; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'none'; base-uri 'none'; form-action 'none'",
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404).end(); }
}).listen(port, '127.0.0.1', () => console.log(`Open http://127.0.0.1:${port}/ (no outgoing requests)`));
