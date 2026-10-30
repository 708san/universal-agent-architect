import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectMcpConfig } from '../dist/mcp-config.js';

test('MCP config discovery returns transport/status metadata without values', () => {
  const report = inspectMcpConfig([
    { path: '.mcp.json', content: JSON.stringify({ mcpServers: {
      local: { command: '/secret/bin/server', args: ['--token', 'hidden'], env: { API_KEY: 'secret-value' } },
      remote: { url: 'https://secret.example/mcp', headers: { Authorization: 'Bearer hidden' } },
    } }) },
    { path: '.gemini/settings.json', content: JSON.stringify({ mcpServers: { gemini: { httpUrl: 'http://localhost/mcp' } } }) },
    { path: '.codex/config.toml', content: '[mcp_servers.docs]\nurl = "https://docs.example/mcp"\n\n[mcp_servers.local]\ncommand = "server"\nenv = { TOKEN = "hidden" }\n' },
  ]);
  assert.deepEqual(report.findings.map(finding => [finding.configPath, finding.name, finding.transport, finding.status, finding.hasCredentialLikeFields]), [
    ['.codex/config.toml', 'docs', 'unknown', 'unsupported', false],
    ['.codex/config.toml', 'local', 'stdio', 'valid', true],
    ['.gemini/settings.json', 'gemini', 'http', 'valid', false],
    ['.mcp.json', 'local', 'stdio', 'valid', true],
    ['.mcp.json', 'remote', 'unknown', 'unsupported', true],
  ]);
  assert.ok(!JSON.stringify(report).includes('/secret/bin/server'));
  assert.ok(!JSON.stringify(report).includes('secret-value'));
  assert.ok(!JSON.stringify(report).includes('https://secret.example/mcp'));
});

test('MCP config discovery fails closed for malformed, unsafe and oversized configs', () => {
  const report = inspectMcpConfig([
    { path: '.mcp.json', content: '{not-json}' },
    { path: '.gemini/settings.json', content: JSON.stringify({ mcpServers: { broken: [] } }) },
    { path: '../.mcp.json', content: '{}' },
    { path: '.codex/config.toml', content: 'x'.repeat(100_001) },
  ]);
  assert.ok(report.findings.some(finding => finding.status === 'malformed'));
  assert.ok(report.findings.some(finding => finding.status === 'skipped'));
  assert.ok(report.warnings.length >= 1);
  assert.ok(!JSON.stringify(report).includes('not-json'));
});
