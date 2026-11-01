import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateRuntimeEvidence } from '../dist/runtime-evidence.js';

const root = process.cwd();

test('metadata-only partial runtime evidence fixture is valid', async () => {
  const fixture = JSON.parse(await readFile(path.join(root, 'tests/fixtures/runtime-evidence-codex-0.1.json'), 'utf8'));
  assert.deepEqual(validateRuntimeEvidence(fixture), []);
  assert.equal(fixture.overallStatus, 'partial');
  assert.equal(fixture.capabilities.permissions, 'not-tested');
});

test('runtime evidence cannot claim verified without complete reviewed runtime evidence', async () => {
  const fixture = JSON.parse(await readFile(path.join(root, 'tests/fixtures/runtime-evidence-codex-0.1.json'), 'utf8'));
  const invalid = {
    ...fixture,
    overallStatus: 'verified',
    capabilities: Object.fromEntries(Object.keys(fixture.capabilities).map(key => [key, 'runtime-verified'])),
  };
  assert.ok(validateRuntimeEvidence(invalid).some(problem => problem.includes('human-reviewed')));
});

test('runtime evidence rejects unsafe IDs and unbounded limitations', async () => {
  const fixture = JSON.parse(await readFile(path.join(root, 'tests/fixtures/runtime-evidence-codex-0.1.json'), 'utf8'));
  const invalid = { ...fixture, evidenceIds: ['../private-output'], limitations: ['x'.repeat(501)] };
  const problems = validateRuntimeEvidence(invalid);
  assert.ok(problems.some(problem => problem.includes('safe IDs')));
  assert.ok(problems.some(problem => problem.includes('bounded single-line text')));
});
