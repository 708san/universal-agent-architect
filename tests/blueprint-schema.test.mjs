import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeProject, proposeBlueprint } from '../dist/core.js';

const schemaPath = path.resolve('schemas/blueprint-0.1.schema.json');

test('Blueprint 0.1 schema covers the emitted deterministic shape', () => {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const facts = analyzeProject({ paths: ['src/main.ts', 'tests/main.test.mjs', 'package.json'] });
  const blueprint = proposeBlueprint(facts, {
    target: 'codex',
    workType: 'coding',
    needsReview: true,
    securityProfile: 'strict',
  });

  assert.equal(schema.$id, 'https://github.com/708san/universal-agent-architect/schema/blueprint-0.1.json');
  assert.deepEqual(schema.required, [
    'schemaVersion', 'target', 'workType', 'agents', 'skills', 'reasons', 'warnings', 'security',
  ]);
  assert.equal(blueprint.schemaVersion, schema.properties.schemaVersion.const);
  assert.ok(schema.properties.target.enum.includes(blueprint.target));
  assert.equal(blueprint.workType, schema.properties.workType.const);
  assert.ok(blueprint.agents.length >= 1);
  assert.equal(blueprint.security.network, schema.$defs.securityRequirements.properties.network.const);
  assert.equal(blueprint.security.runGeneratedScripts, false);
  assert.ok(blueprint.security.securityTests.every(check =>
    schema.$defs.securityRequirements.properties.securityTests.items.enum.includes(check)));
});
