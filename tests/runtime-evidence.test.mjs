import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { createRuntimeEvidenceTemplate, promoteRuntimeEvidence, validateRuntimeEvidence } from '../dist/runtime-evidence.js';
import { validateCapabilityRegistry } from '../dist/capability-registry.js';

const root = process.cwd();

test('metadata-only partial runtime evidence fixture is valid', async () => {
  const fixture = JSON.parse(await readFile(path.join(root, 'tests/fixtures/runtime-evidence-codex-0.1.json'), 'utf8'));
  assert.deepEqual(validateRuntimeEvidence(fixture), []);
  assert.equal(fixture.overallStatus, 'partial');
  assert.equal(fixture.capabilities.permissions, 'not-tested');
});

test('runtime evidence template is deterministic and explicitly not-tested', () => {
  const template = createRuntimeEvidenceTemplate({
    target: 'codex', edition: 'CLI/IDE', version: 'unknown', verifiedAt: '2026-11-02',
  });
  assert.deepEqual(validateRuntimeEvidence(template), []);
  assert.equal(template.overallStatus, 'not-tested');
  assert.equal(template.reviewStatus, 'unreviewed');
  assert.deepEqual(template.capabilities, {
    instructions: 'not-tested', skills: 'not-tested', subagents: 'not-tested', mcp: 'not-tested', permissions: 'not-tested',
  });
  assert.deepEqual(template.evidenceIds, ['codex-runtime-verification']);
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

test('partial runtime evidence cannot be promoted', async () => {
  const fixture = JSON.parse(await readFile(path.join(root, 'tests/fixtures/runtime-evidence-codex-0.1.json'), 'utf8'));
  const registry = JSON.parse(await readFile(path.join(root, 'data/capability-registry-0.1.json'), 'utf8'));
  const result = promoteRuntimeEvidence(registry, fixture);
  assert.equal(result.candidate, undefined);
  assert.ok(result.problems.some(problem => problem.includes('eligible for promotion')));
});

test('complete reviewed runtime evidence promotes only its target metadata', async () => {
  const fixture = JSON.parse(await readFile(path.join(root, 'tests/fixtures/runtime-evidence-codex-0.1.json'), 'utf8'));
  const registry = JSON.parse(await readFile(path.join(root, 'data/capability-registry-0.1.json'), 'utf8'));
  const evidence = {
    ...fixture,
    edition: 'CLI/IDE',
    version: '1.2.3',
    verifiedAt: '2026-11-02',
    overallStatus: 'verified',
    reviewStatus: 'human-reviewed',
    evidenceIds: ['runtime-smoke-001'],
    capabilities: Object.fromEntries(Object.keys(fixture.capabilities).map(key => [key, 'runtime-verified'])),
  };
  const result = promoteRuntimeEvidence(registry, evidence);
  assert.deepEqual(result.problems, []);
  assert.equal(result.target, 'codex');
  assert.ok(result.candidate);
  const codex = result.candidate.entries.find(entry => entry.target === 'codex');
  assert.equal(codex.status, 'verified');
  assert.deepEqual(codex.capabilities, {
    instructions: 'verified', skills: 'verified', subagents: 'verified', mcp: 'verified',
  });
  assert.deepEqual(codex.fixtureIds, registry.entries.find(entry => entry.target === 'codex').fixtureIds);
  assert.match(codex.notes, /runtime-smoke-001/);
  assert.match(codex.notes, /Renderer and validators cover documented/);
  assert.equal(codex.notes.includes('private'), false);
  assert.deepEqual(validateCapabilityRegistry(result.candidate, new Set(registry.entries.flatMap(entry => entry.fixtureIds))), []);
  assert.equal(result.candidate.entries.find(entry => entry.target === 'chatgpt').status, 'partial');
});

test('promotion commands keep partial evidence read-only and require confirmation', async () => {
  const registryPath = path.join(root, 'data/capability-registry-0.1.json');
  const before = await readFile(registryPath, 'utf8');
  const temp = await mkdtemp(path.join(os.tmpdir(), 'uaa-runtime-promotion-'));
  const evidencePath = path.join(temp, 'evidence.json');
  const fixture = await readFile(path.join(root, 'tests/fixtures/runtime-evidence-codex-0.1.json'), 'utf8');
  await writeFile(evidencePath, fixture);
  try {
    const validation = spawnSync(process.execPath, ['scripts/promote-runtime-evidence.mjs', 'validate', `--evidence=${evidencePath}`], { cwd: root, encoding: 'utf8' });
    assert.notEqual(validation.status, 0);
    assert.match(validation.stderr, /eligible for promotion/);
    const diff = spawnSync(process.execPath, ['scripts/promote-runtime-evidence.mjs', 'diff', `--evidence=${evidencePath}`], { cwd: root, encoding: 'utf8' });
    assert.notEqual(diff.status, 0);
    assert.match(diff.stderr, /eligible for promotion/);
    const blocked = spawnSync(process.execPath, ['scripts/promote-runtime-evidence.mjs', 'apply', `--evidence=${evidencePath}`], { cwd: root, encoding: 'utf8' });
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /--confirm/);
    assert.equal(await readFile(registryPath, 'utf8'), before);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('promotion command rejects oversized evidence before parsing', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'uaa-runtime-promotion-large-'));
  const evidencePath = path.join(temp, 'oversized.json');
  await writeFile(evidencePath, `${' '.repeat(128 * 1024)}{}`);
  try {
    const run = spawnSync(process.execPath, ['scripts/promote-runtime-evidence.mjs', 'validate', `--evidence=${evidencePath}`], { cwd: root, encoding: 'utf8' });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /exceeds the 131072-byte limit/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('runtime evidence template command stages safely and refuses traversal or overwrite', async () => {
  const stage = `generated/runtime-evidence-test-${process.pid}`;
  const output = `${stage}/codex.json`;
  const outputPath = path.join(root, output);
  try {
    const run = spawnSync(process.execPath, [
      'scripts/create-runtime-evidence-template.mjs',
      '--target=codex', '--edition=CLI/IDE', '--version=unknown', '--date=2026-11-02',
      `--output=${output}`,
    ], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const created = JSON.parse(await readFile(outputPath, 'utf8'));
    assert.equal(created.overallStatus, 'not-tested');
    const overwrite = spawnSync(process.execPath, [
      'scripts/create-runtime-evidence-template.mjs',
      '--target=codex', '--edition=CLI/IDE', '--version=unknown', '--date=2026-11-02',
      `--output=${output}`,
    ], { cwd: root, encoding: 'utf8' });
    assert.notEqual(overwrite.status, 0);
    assert.match(overwrite.stderr, /Refusing overwrite/);
    const traversal = spawnSync(process.execPath, [
      'scripts/create-runtime-evidence-template.mjs',
      '--target=codex', '--edition=CLI/IDE', '--version=unknown', '--date=2026-11-02',
      '--output=generated/../runtime-evidence-outside.json',
    ], { cwd: root, encoding: 'utf8' });
    assert.notEqual(traversal.status, 0);
    assert.match(traversal.stderr, /inside generated/);
  } finally {
    await rm(path.join(root, stage), { recursive: true, force: true });
    await rm(path.join(root, 'runtime-evidence-outside.json'), { force: true });
  }
});
