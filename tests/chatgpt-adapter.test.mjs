import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeProject, proposeBlueprint, generateArtifacts, validateArtifacts } from '../dist/core.js';

const fixture = JSON.parse(fs.readFileSync(path.resolve('tests/fixtures/chatgpt-plugin-0.1.json'), 'utf8'));

test('ChatGPT adapter renders a portable plugin manifest and Skills without runtime claims', () => {
  const facts = analyzeProject({ paths: ['src/app.ts', 'tests/app.test.ts'] });
  const blueprint = proposeBlueprint(facts, {
    target: 'chatgpt',
    workType: 'coding',
    needsReview: true,
    securityProfile: 'strict',
  });
  const result = generateArtifacts(blueprint);
  assert.equal(result.supported, true);
  assert.deepEqual(validateArtifacts(result), []);
  const manifest = result.files.find(file => file.path === fixture.manifest);
  assert.ok(manifest);
  assert.match(manifest.content, new RegExp(`\\"\\$schema\\": \\"${fixture.schema.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\"`));
  assert.ok(result.files.some(file => file.path.startsWith(`${fixture.skillRoot}/`)));
  assert.equal(blueprint.targetEdition, 'browser/plugin');
  assert.equal(blueprint.provenance.verificationStatus, 'partial');
  assert.deepEqual(blueprint.provenance.sourceUrls, [
    'https://developers.openai.com/plugins/build/plugins',
    'https://developers.openai.com/plugins/deploy/submission-errors',
    'https://developers.openai.com/plugins/quickstart',
  ]);
  assert.match(result.files.find(file => file.path === 'skills/code-review/SKILL.md').content, /^---\nname: code-review\ndescription:/);
  assert.ok(!JSON.stringify(result).includes('api_key'));
  for (const unsupported of fixture.unsupportedGeneratedFeatures) assert.ok(!JSON.stringify(result).includes(unsupported));
  assert.equal(fixture.runtimeEvidence, 'not-tested');
});

test('ChatGPT adapter emits a fallback Skill and rejects malformed plugin manifests', () => {
  const facts = analyzeProject({ paths: [] });
  const result = generateArtifacts(proposeBlueprint(facts, { target: 'chatgpt', workType: 'coding' }));
  assert.equal(result.supported, true);
  assert.ok(result.files.some(file => file.path === 'skills/project-workflow/SKILL.md'));
  const malformed = {
    ...result,
    files: result.files.map(file => file.path === 'plugin.json'
      ? { ...file, content: '{"name":"wrong"}' }
      : file),
  };
  assert.ok(validateArtifacts(malformed).some(problem => problem.includes('portable Agent Plugin')));
});
