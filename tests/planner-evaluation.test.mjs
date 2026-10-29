import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeProject, proposeBlueprint, validateBlueprint } from '../dist/core.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cases = JSON.parse(readFileSync(path.join(root, 'tests/fixtures/planner-cases.json'), 'utf8'));

for (const scenario of cases) {
  test(`planner evaluation: ${scenario.id}`, () => {
    const facts = analyzeProject(scenario.input);
    const blueprint = proposeBlueprint(facts, scenario.request);
    assert.deepEqual(blueprint.agents.map(agent => agent.id), scenario.expected.agentIds);
    assert.deepEqual(blueprint.skills.map(skill => skill.id), scenario.expected.skillIds);
    assert.deepEqual(new Set(blueprint.agents.map(agent => agent.id)).size, blueprint.agents.length);
    assert.deepEqual(new Set(blueprint.skills.map(skill => skill.id)).size, blueprint.skills.length);
    for (const reason of scenario.expected.reasons) {
      assert.ok([...blueprint.reasons, ...blueprint.warnings].some(text => text.includes(reason)), `${scenario.id} missing reason: ${reason}`);
    }
    assert.deepEqual(validateBlueprint(blueprint), []);
  });
}
