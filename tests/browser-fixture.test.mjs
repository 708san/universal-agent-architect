import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectBrowserInput } from '../web/browser-input.mjs';
import { analyzeProject, proposeBlueprint, generateArtifacts, validateArtifacts } from '../dist/core.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(readFileSync(path.join(root, 'tests/fixtures/sample-python.json'), 'utf8'));

test('browser and CLI produce the same golden facts, Blueprint and validation result', async () => {
  const entries = fixture.input.paths.map(relativePath => ({
    webkitRelativePath: `sample-python/${relativePath}`,
    name: relativePath.split('/').at(-1),
    size: fixture.input.manifests?.[relativePath]?.length ?? 0,
    text: async () => fixture.input.manifests?.[relativePath] ?? '',
  }));
  const browserInput = await collectBrowserInput(entries);
  const browserFacts = analyzeProject(browserInput);
  const browserBlueprint = proposeBlueprint(browserFacts, { target: 'codex', workType: 'coding', needsReview: true });
  const browserArtifacts = generateArtifacts(browserBlueprint);

  const cli = path.join(root, 'scripts/cli.mjs');
  const run = spawnSync(process.execPath, [cli, 'analyze', path.join(root, 'examples/sample-python'), 'codex'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const cliOutput = JSON.parse(run.stdout);
  assert.deepEqual(browserFacts, cliOutput.facts);
  assert.deepEqual(browserBlueprint, cliOutput.blueprint);
  assert.deepEqual(validateArtifacts(browserArtifacts), []);
  assert.deepEqual(browserArtifacts, generateArtifacts(cliOutput.blueprint));
});
