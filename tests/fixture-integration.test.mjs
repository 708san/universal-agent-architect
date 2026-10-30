import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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
