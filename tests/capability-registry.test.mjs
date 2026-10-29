import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('capability registry is locally valid and never requires network access', () => {
  const output = execFileSync(process.execPath, ['scripts/check-capability-registry.mjs'], { encoding: 'utf8' });
  assert.match(output, /Capability registry: OK \(5 targets; no network access\)/);
});
