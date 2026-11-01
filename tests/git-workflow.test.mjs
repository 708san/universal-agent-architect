import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProject, generateArtifacts, proposeBlueprint, validateArtifacts } from '../dist/core.js';

const instructionPaths = {
  codex: 'AGENTS.md',
  'claude-code': 'CLAUDE.md',
  'gemini-cli': 'GEMINI.md',
  antigravity: 'AGENTS.md',
};

test('generated targets share the governed Git lifecycle', () => {
  const facts = analyzeProject({ paths: [] });
  for (const target of ['codex', 'claude-code', 'gemini-cli', 'antigravity', 'chatgpt']) {
    const result = generateArtifacts(proposeBlueprint(facts, {
      target,
      workType: 'coding',
      needsReview: true,
    }));
    assert.equal(result.supported, true, target);
    assert.deepEqual(validateArtifacts(result), [], target);

    const workflowFile = target === 'chatgpt'
      ? result.files.find(file => file.path === 'skills/code-review/SKILL.md')
      : result.files.find(file => file.path === instructionPaths[target]);
    assert.ok(workflowFile, `${target} workflow file`);
    assert.match(workflowFile.content, /latest `main`/);
    assert.match(workflowFile.content, /Conventional Commit/);
    assert.match(workflowFile.content, /pull request/);
    assert.match(workflowFile.content, /CI passes and required review/);
    assert.match(workflowFile.content, /without explicit user approval/);
    assert.match(workflowFile.content, /never claim CI or merge success without evidence/);
    assert.doesNotMatch(workflowFile.content, /- - Git workflow/);
  }
});
