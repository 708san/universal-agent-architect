import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeProject, proposeBlueprint, generateArtifacts, validateArtifacts } from '../dist/core.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(readFileSync(path.join(root, 'tests/fixtures/sample-python.json'), 'utf8'));

test('golden fixture keeps core facts and Codex validation deterministic', () => {
  const facts = analyzeProject(fixture.input);
  assert.deepEqual(facts, fixture.expectedFacts);
  const blueprint = proposeBlueprint(facts, { target: 'codex', workType: 'coding', needsReview: true });
  const result = generateArtifacts(blueprint);
  assert.equal(result.supported, true);
  assert.deepEqual(validateArtifacts(result), []);
});

test('CLI facts match the golden fixture', () => {
  const cli = path.join(root, 'scripts/cli.mjs');
  const sample = path.join(root, 'examples/sample-python');
  const run = spawnSync(process.execPath, [cli, 'analyze', sample, 'codex'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout).facts, fixture.expectedFacts);
});

test('CLI exposes the strict security profile', () => {
  const cli = path.join(root, 'scripts/cli.mjs');
  const sample = path.join(root, 'examples/sample-python');
  const run = spawnSync(process.execPath, [cli, 'analyze', sample, 'codex', 'strict'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const output = JSON.parse(run.stdout);
  assert.equal(output.blueprint.security.profile, 'strict');
  assert.ok(output.blueprint.security.securityTests.includes('mcp-redaction'));
});

test('CLI AST mode returns bounded structural facts without source contents', () => {
  const cli = path.join(root, 'scripts/cli.mjs');
  const sample = path.join(root, 'examples/sample-python');
  const run = spawnSync(process.execPath, [cli, 'analyze', sample, 'codex', 'baseline', '--ast'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const output = JSON.parse(run.stdout);
  assert.ok(output.ast.files.some(file => file.path === 'src/app.py' && file.language === 'python' && file.syntax === 'ok'));
  assert.ok(!run.stdout.includes('return a + b'));
});

test('CLI MCP config mode returns structural discovery without command or URL values', () => {
  const cli = path.join(root, 'scripts/cli.mjs');
  const sample = path.join(root, 'examples/sample-python');
  const run = spawnSync(process.execPath, [cli, 'analyze', sample, 'codex', 'baseline', '--mcp-config'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const output = JSON.parse(run.stdout);
  assert.ok(Array.isArray(output.mcpConfig.findings));
  assert.ok(!run.stdout.includes('http://'));
});

test('CLI MCP config mode discovers recognized project files without starting declared commands', async () => {
  const cli = path.join(root, 'scripts/cli.mjs');
  const project = await mkdtemp(path.join(tmpdir(), 'uaa-mcp-config-'));
  const marker = path.join(project, 'should-not-exist');
  await writeFile(path.join(project, '.mcp.json'), JSON.stringify({ mcpServers: {
    local_tool: { command: process.execPath, args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'started')`] },
  } }));
  try {
    const run = spawnSync(process.execPath, [cli, 'analyze', project, 'codex', 'baseline', '--mcp-config'], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const output = JSON.parse(run.stdout);
    assert.deepEqual(output.mcpConfig.findings.map(finding => [finding.configPath, finding.name, finding.transport, finding.status]), [
      ['.mcp.json', 'local_tool', 'stdio', 'valid'],
    ]);
    assert.ok(!run.stdout.includes('should-not-exist'));
    assert.throws(() => readFileSync(marker));
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});
