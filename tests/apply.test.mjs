import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplyPlan } from '../dist/apply.js';

test('apply plan is deterministic and rejects unsafe or duplicate artifacts', () => {
  const plan = createApplyPlan(['AGENTS.md'], [
    { path: 'AGENTS.md', content: 'safe' },
    { path: '.agents/skills/review/SKILL.md', content: 'safe' },
  ]);
  assert.deepEqual(plan.changes, [
    { path: 'AGENTS.md', action: 'replace', category: 'instruction' },
    { path: '.agents/skills/review/SKILL.md', action: 'add', category: 'skill' },
  ]);
  assert.throws(() => createApplyPlan([], [{ path: '../escape', content: 'bad' }]), /Unsafe staged artifact/);
  assert.throws(() => createApplyPlan([], [
    { path: 'AGENTS.md', content: 'a' },
    { path: 'AGENTS.md', content: 'b' },
  ]), /Duplicate staged artifact/);
});
