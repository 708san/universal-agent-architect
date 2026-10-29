import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeProject, proposeBlueprint, generateArtifacts, validateArtifacts } from '../dist/core.js';

const fixture = JSON.parse(fs.readFileSync(path.resolve('tests/fixtures/codex-adapter-0.1.json'), 'utf8'));

test('Codex adapter output matches the reviewed offline format fixture', () => {
  const facts = analyzeProject({ paths: [] });
  const blueprint = proposeBlueprint(facts, {
    target: 'codex',
    workType: 'coding',
    needsReview: true,
    independentWorkstreams: 2,
  });
  const result = generateArtifacts(blueprint);
  assert.equal(result.supported, true);
  assert.deepEqual(validateArtifacts(result), []);

  const paths = result.files.map(file => file.path);
  assert.ok(paths.includes(fixture.formats.instructionFiles[0]));
  assert.ok(paths.some(filePath => filePath.startsWith(`${fixture.formats.skillRoot}/`)));
  assert.ok(paths.some(filePath => filePath.startsWith(`${fixture.formats.subagentRoot}/`)));

  const instruction = result.files.find(file => file.path === 'AGENTS.md').content;
  assert.match(instruction, /Network: deny/);
  assert.match(instruction, /Run only authorized tests/);

  const skill = result.files.find(file => file.path.endsWith('/SKILL.md'));
  assert.ok(skill);
  assert.match(skill.content, /^---\nname: [a-z0-9]+(?:-[a-z0-9]+)*\ndescription: .+\n---\n/);

  const subagent = result.files.find(file => file.path.startsWith('.codex/agents/'));
  assert.ok(subagent);
  for (const key of fixture.formats.subagentRequiredKeys) assert.match(subagent.content, new RegExp(`^${key}\\s*=`, 'm'));
  assert.equal(fixture.runtimeEvidence, 'not-tested');
});

test('Codex adapter rejects malformed custom-agent output', () => {
  const facts = analyzeProject({ paths: [] });
  const blueprint = proposeBlueprint(facts, { target: 'codex', workType: 'coding', independentWorkstreams: 2 });
  const result = generateArtifacts(blueprint);
  const malformed = {
    ...result,
    files: result.files.map(file => file.path.startsWith('.codex/agents/')
      ? { ...file, content: 'name = "reviewer"\ndescription = "missing instructions"\n' }
      : file),
  };
  assert.ok(validateArtifacts(malformed).some(problem => problem.includes('Codex custom agent')));
});
