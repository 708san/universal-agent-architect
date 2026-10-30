import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverScript = path.join(root, 'scripts', 'mcp-server.mjs');

function startServer(project) {
  const child = spawn(process.execPath, [serverScript, `--project=${project}`], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '';
  const pending = new Map();
  const stdoutLines = [];
  child.stdout.on('data', chunk => {
    buffer += chunk.toString();
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      stdoutLines.push(line);
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      if (message.id !== undefined) pending.get(message.id)?.(message);
    }
  });
  const request = (id, method, params = {}) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`MCP request timed out: ${method}`)); }, 5_000);
    pending.set(id, message => { clearTimeout(timer); pending.delete(id); resolve(message); });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
  const notify = (method, params = {}) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  return { child, request, notify, stdoutLines };
}

test('MCP stdio exposes only bounded read-only tools and redacts project content', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'uaa-mcp-'));
  const project = path.join(temp, 'project');
  try {
    await writeFile(path.join(temp, 'marker.txt'), 'unchanged');
    await import('node:fs/promises').then(({ mkdir }) => mkdir(project));
    await writeFile(path.join(project, 'app.py'), 'SECRET=do-not-return\n');
    const server = startServer(project);
    try {
      const initialized = await server.request(1, 'initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '0.1.0' } });
      assert.equal(initialized.jsonrpc, '2.0');
      assert.ok(initialized.result?.serverInfo);
      server.notify('notifications/initialized');
      const listed = await server.request(2, 'tools/list');
      assert.deepEqual(listed.result.tools.map(tool => tool.name), ['list_capabilities', 'analyze_project', 'propose_blueprint']);

      const capabilities = await server.request(3, 'tools/call', { name: 'list_capabilities', arguments: {} });
      const capabilitiesText = capabilities.result.content[0].text;
      assert.ok(JSON.parse(capabilitiesText).entries.length >= 1);
      const analyzed = await server.request(4, 'tools/call', { name: 'analyze_project', arguments: {} });
      const analyzedText = analyzed.result.content[0].text;
      assert.ok(analyzedText.includes('projectScope'));
      assert.ok(!analyzedText.includes('SECRET=do-not-return'));
      assert.ok(!analyzedText.includes('app.py'));

      const invalid = await server.request(5, 'tools/call', { name: 'propose_blueprint', arguments: { target: '/etc/passwd' } });
      assert.ok(invalid.error || invalid.result?.isError);
      assert.equal(await readFile(path.join(temp, 'marker.txt'), 'utf8'), 'unchanged');
      assert.ok(server.stdoutLines.every(line => JSON.parse(line).jsonrpc === '2.0'));
    } finally {
      server.child.kill();
    }
  } finally { await rm(temp, { recursive: true, force: true }); }
});
