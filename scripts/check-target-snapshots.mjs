import { readFile } from 'node:fs/promises';

const allowedStatuses = new Set(['verified', 'partial', 'planned', 'unknown', 'unsupported', 'experimental']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const registry = JSON.parse(await readFile('data/capability-registry-0.1.json', 'utf8'));

if (!Array.isArray(registry.entries)) throw new Error('Capability registry entries are missing.');
for (const entry of registry.entries) {
  const snapshot = JSON.parse(await readFile(`capabilities/${entry.target}.json`, 'utf8'));
  if (snapshot.target !== entry.target) throw new Error(`Target snapshot mismatch: ${entry.target}`);
  if (snapshot.registry_version !== registry.schemaVersion) throw new Error(`Target snapshot registry version mismatch: ${entry.target}`);
  if (!datePattern.test(snapshot.checked_at) || snapshot.checked_at !== entry.checkedAt) throw new Error(`Target snapshot date mismatch: ${entry.target}`);
  if (!allowedStatuses.has(entry.status)) throw new Error(`Unknown registry status: ${entry.target}`);
  const expectedRendererStatus = entry.status === 'partial' || entry.status === 'verified' || entry.status === 'experimental'
    ? 'partial'
    : 'not_implemented';
  if (snapshot.renderer_status !== expectedRendererStatus) throw new Error(`Target snapshot renderer status mismatch: ${entry.target}`);
}
console.log(`Target capability snapshots: OK (${registry.entries.length} targets; no network access)`);
