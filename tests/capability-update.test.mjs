import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { diffCapabilityRegistries, validateCapabilityUpdateCandidate } from '../dist/capability-registry.js';

const root = process.cwd();

async function loadRegistry() {
  return JSON.parse(await readFile(path.join(root, 'data/capability-registry-0.1.json'), 'utf8'));
}

test('capability update candidates validate and diff metadata without exposing notes', async () => {
  const registry = await loadRegistry();
  const fixtureIds = new Set(registry.entries.flatMap(entry => entry.fixtureIds));
  const candidate = {
    candidateVersion: '0.1',
    createdAt: '2026-11-01',
    registry: {
      ...registry,
      entries: registry.entries.map(entry => entry.target === 'codex'
        ? { ...entry, checkedAt: '2026-11-02', notes: 'private candidate detail must not be echoed' }
        : entry),
    },
  };
  assert.deepEqual(validateCapabilityUpdateCandidate(candidate, fixtureIds), []);
  const changes = diffCapabilityRegistries(registry, candidate.registry);
  assert.deepEqual(changes[0], {
    target: 'codex',
    changedFields: ['checkedAt', 'notes'],
    previousStatus: 'partial',
    candidateStatus: 'partial',
  });
  assert.equal(JSON.stringify(changes).includes('private candidate detail'), false);
});

test('spec-refresh diff is read-only and apply requires explicit confirmation', async () => {
  const registryPath = path.join(root, 'data/capability-registry-0.1.json');
  const before = await readFile(registryPath, 'utf8');
  const registry = JSON.parse(before);
  const temp = await mkdtemp(path.join(os.tmpdir(), 'uaa-spec-refresh-'));
  const candidatePath = path.join(temp, 'candidate.json');
  await writeFile(candidatePath, JSON.stringify({
    candidateVersion: '0.1',
    createdAt: '2026-11-02',
    registry: {
      ...registry,
      entries: registry.entries.map(entry => entry.target === 'codex' ? { ...entry, checkedAt: '2026-11-02' } : entry),
    },
  }));
  try {
    const diff = execFileSync(process.execPath, ['scripts/spec-refresh.mjs', 'diff', `--candidate=${candidatePath}`], { cwd: root, encoding: 'utf8' });
    assert.match(diff, /read-only-diff/);
    assert.match(diff, /"target": "codex"/);
    assert.equal(diff.includes('learn.chatgpt.com'), false);
    assert.equal(await readFile(registryPath, 'utf8'), before);

    const blocked = spawnSync(process.execPath, ['scripts/spec-refresh.mjs', 'apply', `--candidate=${candidatePath}`], { cwd: root, encoding: 'utf8' });
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /--confirm/);
    assert.equal(await readFile(registryPath, 'utf8'), before);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('spec-refresh rejects non-official candidate sources', async () => {
  const registry = await loadRegistry();
  const fixtureIds = new Set(registry.entries.flatMap(entry => entry.fixtureIds));
  const candidate = {
    candidateVersion: '0.1',
    createdAt: '2026-11-01',
    registry: {
      ...registry,
      entries: registry.entries.map(entry => entry.target === 'codex'
        ? { ...entry, sourceUrls: ['https://example.test/spec'] }
        : entry),
    },
  };
  assert.ok(validateCapabilityUpdateCandidate(candidate, fixtureIds).some(problem => problem.includes('allowlisted official host')));
});
