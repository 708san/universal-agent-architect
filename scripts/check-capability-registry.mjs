import { readFile } from 'node:fs/promises';

const allowedTargets = new Set(['codex', 'claude-code', 'gemini-cli', 'antigravity', 'chatgpt']);
const allowedStatuses = new Set(['verified', 'partial', 'planned', 'unknown', 'unsupported', 'experimental']);
const capabilityNames = ['instructions', 'skills', 'subagents', 'mcp'];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const registry = JSON.parse(await readFile('data/capability-registry-0.1.json', 'utf8'));
if (registry.schemaVersion !== '0.1' || !datePattern.test(registry.checkedAt) || !Array.isArray(registry.entries)) {
  throw new Error('Invalid capability registry envelope.');
}

const seenTargets = new Set();
for (const entry of registry.entries) {
  if (!allowedTargets.has(entry.target) || seenTargets.has(entry.target)) throw new Error(`Invalid or duplicate target: ${entry.target}`);
  seenTargets.add(entry.target);
  if (!entry.edition || !entry.version || !datePattern.test(entry.checkedAt)) throw new Error(`Invalid metadata: ${entry.target}`);
  if (!allowedStatuses.has(entry.status)) throw new Error(`Invalid status: ${entry.target}`);
  if (!Array.isArray(entry.sourceUrls) || entry.sourceUrls.some(url => typeof url !== 'string' || !url.startsWith('https://'))) throw new Error(`Invalid source URL: ${entry.target}`);
  if (!Array.isArray(entry.fixtureIds) || new Set(entry.fixtureIds).size !== entry.fixtureIds.length) throw new Error(`Invalid fixture IDs: ${entry.target}`);
  if (!entry.capabilities || capabilityNames.some(name => !allowedStatuses.has(entry.capabilities[name]))) throw new Error(`Invalid capabilities: ${entry.target}`);
  if ((entry.status === 'verified' || entry.status === 'partial') && (entry.sourceUrls.length === 0 || entry.fixtureIds.length === 0)) {
    throw new Error(`Verified or partial entry needs sources and fixtures: ${entry.target}`);
  }
}
if (seenTargets.size !== allowedTargets.size) throw new Error('Registry must contain every declared product target.');
console.log(`Capability registry: OK (${seenTargets.size} targets; no network access)`);
