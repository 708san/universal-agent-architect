import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeProject, proposeBlueprint, generateArtifacts, validateArtifacts } from '../dist/core.js';

const fixture = JSON.parse(fs.readFileSync(path.resolve('tests/fixtures/antigravity-adapter-0.1.json'), 'utf8'));

test('Antigravity adapter renders documented workspace files without runtime claims', () => {
  const facts = analyzeProject({ paths: ['src/app.ts', 'tests/app.test.ts'] });
  const blueprint = proposeBlueprint(facts, {
    target: 'antigravity',
    workType: 'coding',
    needsReview: true,
    independentWorkstreams: 2,
    securityProfile: 'strict',
  });
  const result = generateArtifacts(blueprint);
  assert.equal(result.supported, true);
  assert.deepEqual(validateArtifacts(result), []);

  const paths = result.files.map(file => file.path);
  assert.ok(paths.includes(fixture.formats.instructionFile));
  assert.ok(paths.some(filePath => filePath.startsWith(`${fixture.formats.skillRoot}/`)));
  assert.ok(paths.some(filePath => filePath.startsWith(`${fixture.formats.subagentRoot}/`)));
  assert.equal(blueprint.targetEdition, 'App/CLI/IDE');
  assert.equal(blueprint.provenance.verificationStatus, 'partial');
  assert.deepEqual(blueprint.provenance.sourceUrls, [
    'https://antigravity.google/docs/rules/',
    'https://antigravity.google/docs/skills',
    'https://antigravity.google/docs/subagents?tab=cli',
  ]);
  assert.match(result.files.find(file => file.path === 'AGENTS.md').content, /Network: deny/);
  assert.match(result.files.find(file => file.path === '.agents/skills/code-review/SKILL.md').content, /^---\nname: code-review\ndescription:/);
  const reviewer = result.files.find(file => file.path === '.agents/agents/reviewer.md');
  assert.ok(reviewer);
  for (const field of fixture.formats.subagentRequiredFields) assert.match(reviewer.content, new RegExp(`^${field}:`, 'm'));
  assert.match(reviewer.content, /^  - view_file$/m);
  assert.match(reviewer.content, /^  - grep_search$/m);
  assert.match(reviewer.content, /^commandExecutionPolicy: off$/m);
  assert.ok(!JSON.stringify(result).includes('api_key'));
  assert.equal(fixture.runtimeEvidence, 'not-tested');
});

test('Antigravity adapter rejects malformed subagent output and unsupported targets', () => {
  const facts = analyzeProject({ paths: [] });
  const blueprint = proposeBlueprint(facts, { target: 'antigravity', workType: 'coding', independentWorkstreams: 2 });
  const result = generateArtifacts(blueprint);
  const malformed = {
    ...result,
    files: result.files.map(file => file.path === '.agents/agents/reviewer.md'
      ? { ...file, content: '---\nname: reviewer\ndescription: missing policy\ntools:\n  - view_file\n---\n' }
      : file),
  };
  assert.ok(validateArtifacts(malformed).some(problem => problem.includes('Antigravity custom agent')));

  const unsupported = generateArtifacts(proposeBlueprint(facts, { target: 'chatgpt', workType: 'coding' }));
  assert.equal(unsupported.supported, false);
  assert.match(unsupported.reason, /not yet implemented/);
  assert.deepEqual(unsupported.files, []);
});
