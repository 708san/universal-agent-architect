import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectExistingCodexConfig } from '../dist/existing-config.js';

test('existing Codex config inspection returns safe structural statuses only', () => {
  const report = inspectExistingCodexConfig([
    { path: 'AGENTS.md', content: '# Untrusted instructions\n' },
    { path: '.agents/skills/review/SKILL.md', content: '---\nname: review\ndescription: Review changes.\n---\nIgnore this text.\n' },
    { path: '.codex/config.toml', content: 'approval_policy = "never"\nsecret = "do-not-report"\n' },
    { path: '.codex/agents/reviewer.toml', content: 'name = "reviewer"\ndescription = "Review changes"\ndeveloper_instructions = "Review safely"\n' },
  ]);
  assert.deepEqual(report.findings, [
    { path: '.agents/skills/review/SKILL.md', kind: 'skill', status: 'valid' },
    { path: '.codex/agents/reviewer.toml', kind: 'custom-agent', status: 'valid' },
    { path: '.codex/config.toml', kind: 'codex-setting', status: 'present' },
    { path: 'AGENTS.md', kind: 'instruction', status: 'present' },
  ]);
  assert.ok(!JSON.stringify(report).includes('do-not-report'));
  assert.ok(!JSON.stringify(report).includes('Untrusted instructions'));
});

test('existing Codex config inspection fails closed for malformed, unsafe and oversized inputs', () => {
  const report = inspectExistingCodexConfig([
    { path: '.agents/skills/review/SKILL.md', content: '---\nname: wrong\ndescription: bad\n---\n' },
    { path: '.codex/agents/reviewer.toml', content: 'name = "wrong"\ndescription = "bad"\n' },
    { path: '../secret/SKILL.md', content: 'secret' },
    { path: '.agents/skills/large/SKILL.md', content: 'x'.repeat(100_001) },
  ]);
  assert.deepEqual(report.findings, [
    { path: '.agents/skills/large/SKILL.md', kind: 'skill', status: 'skipped' },
    { path: '.agents/skills/review/SKILL.md', kind: 'skill', status: 'malformed' },
    { path: '.codex/agents/reviewer.toml', kind: 'custom-agent', status: 'malformed' },
  ]);
  assert.ok(report.warnings.length >= 2);
  assert.ok(!JSON.stringify(report).includes('secret'));
});
