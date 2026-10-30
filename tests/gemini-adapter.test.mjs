import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeProject, proposeBlueprint, generateArtifacts, validateArtifacts } from '../dist/core.js';

const fixture = JSON.parse(fs.readFileSync(path.resolve('tests/fixtures/gemini-cli-adapter-0.1.json'), 'utf8'));

test('Gemini CLI adapter renders documented project files without runtime claims', () => {
  const facts = analyzeProject({ paths: ['src/app.ts', 'tests/app.test.ts'] });
  const blueprint = proposeBlueprint(facts, {
    target: 'gemini-cli',
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
  assert.equal(blueprint.provenance.verificationStatus, 'partial');
  assert.deepEqual(blueprint.provenance.sourceUrls, [
    'https://geminicli.com/docs/cli/gemini-md/',
    'https://geminicli.com/docs/cli/creating-skills/',
    'https://geminicli.com/docs/core/subagents/',
  ]);
  assert.match(result.files.find(file => file.path === 'GEMINI.md').content, /Network: deny/);
  assert.match(result.files.find(file => file.path === '.gemini/skills/code-review/SKILL.md').content, /^---\nname: code-review\ndescription:/);
  const reviewer = result.files.find(file => file.path === '.gemini/agents/reviewer.md');
  assert.ok(reviewer);
  for (const field of fixture.formats.subagentRequiredFields) assert.match(reviewer.content, new RegExp(`^${field}:`, 'm'));
  assert.match(reviewer.content, /^kind: local$/m);
  assert.match(reviewer.content, /^  - read_file$/m);
  assert.match(reviewer.content, /^  - grep_search$/m);
  assert.ok(!JSON.stringify(result).includes('api_key'));
  assert.equal(fixture.runtimeEvidence, 'not-tested');
});

test('Gemini CLI adapter rejects malformed subagent output', () => {
  const facts = analyzeProject({ paths: [] });
  const blueprint = proposeBlueprint(facts, { target: 'gemini-cli', workType: 'coding', independentWorkstreams: 2 });
  const result = generateArtifacts(blueprint);
  const malformed = {
    ...result,
    files: result.files.map(file => file.path === '.gemini/agents/reviewer.md'
      ? { ...file, content: '---\nname: reviewer\ndescription: missing tools\nkind: local\n---\n' }
      : file),
  };
  assert.ok(validateArtifacts(malformed).some(problem => problem.includes('Gemini CLI custom agent')));

});
