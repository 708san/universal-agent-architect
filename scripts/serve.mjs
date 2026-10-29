/** Minimal localhost-only server for the static browser prototype, not an MCP server. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const file = path.resolve(root, `.${pathname === '/' ? '/web/index.html' : pathname}`);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (!['/web/index.html', '/dist/core.js'].includes(pathname === '/' ? '/web/index.html' : pathname)) { res.writeHead(404).end(); return; }
  try {
    const content = await readFile(file);
    res.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream',
      'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'none'; base-uri 'none'; form-action 'none'" });
    res.end(content);
  } catch { res.writeHead(404).end(); }
}).listen(4173, '127.0.0.1', () => console.log('Open http://127.0.0.1:4173/ (no outgoing requests)'));
