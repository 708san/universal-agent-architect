import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateCapabilityRegistry } from '../dist/capability-registry.js';

const registry = JSON.parse(await readFile('data/capability-registry-0.1.json', 'utf8'));
const fixtureIds = new Set((registry.entries ?? []).flatMap(entry => entry.fixtureIds ?? []));
const missingFixtures = [];
for (const fixture of fixtureIds) {
  try { await access(path.resolve(fixture)); }
  catch { missingFixtures.push(fixture); }
}
const problems = [
  ...validateCapabilityRegistry(registry, new Set([...fixtureIds].filter(fixture => !missingFixtures.includes(fixture)))),
  ...missingFixtures.map(fixture => `Missing local fixture: ${fixture}`),
];
if (problems.length) throw new Error(problems.join(' '));
console.log(`Capability registry: OK (${registry.entries.length} targets; no network access)`);
