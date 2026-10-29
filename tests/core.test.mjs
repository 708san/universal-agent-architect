import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { analyzeProject, normalizeBrowserRelativePaths, safeRelativePath, proposeBlueprint, generateArtifacts, validateArtifacts, validateSecurityRequirements, validateBlueprint, findOutputCollisions } from '../dist/core.js';

test('sensitive paths and traversal are filtered', () => {
  for (const p of ['.env','.env.local','folder/.env.production','folder/../etc/passwd','/etc/passwd','C:/secret','dir/.ssh/key','dir/private/data','dir/tls.pem']) assert.equal(safeRelativePath(p), null);
  assert.equal(safeRelativePath('src/main.py'), 'src/main.py');
});
test('safe manifest detection is deterministic and excludes content from report', () => {
  const report=analyzeProject({paths:['src/main.py','tests/test_main.py','AGENTS.md','.env'],manifests:{'requirements.txt':'fastapi==0.10\npytest==8\nSECRET=should-not-leak'}});
  assert.deepEqual(report.languages,['python']);
  assert.equal(report.filesSeen,3);
  assert.ok(report.frameworks.includes('fastapi'));
  assert.equal(report.hasTests,true);
  assert.ok(!JSON.stringify(report).includes('should-not-leak'));
});

test('existing agent configuration is inventoried as paths only', () => {
  const report = analyzeProject({ paths: [
    'AGENTS.md', 'nested/CLAUDE.md', '.agents/skills/review/SKILL.md', '.codex/config.toml', '.codex/agents/reviewer.toml',
  ] });
  assert.deepEqual(report.existingInstructionPaths, ['AGENTS.md', 'nested/CLAUDE.md']);
  assert.deepEqual(report.existingSkillPaths, ['.agents/skills/review/SKILL.md']);
  assert.deepEqual(report.existingSettingsPaths, ['.codex/agents/reviewer.toml', '.codex/config.toml']);
  assert.equal(report.hasExistingAgentInstructions, true);
  assert.equal(report.hasExistingSkills, true);
});

test('browser-selected paths normalize like CLI-relative paths', () => {
  assert.deepEqual(
    normalizeBrowserRelativePaths([
      'sample-project/src/app.py',
      'sample-project/tests/test_app.py',
      'sample-project/package.json',
    ]),
    ['src/app.py', 'tests/test_app.py', 'package.json'],
  );
  assert.deepEqual(normalizeBrowserRelativePaths(['src/app.py', 'tests/test_app.py']), ['src/app.py', 'tests/test_app.py']);
  assert.deepEqual(normalizeBrowserRelativePaths(['sample-project/.env', 'sample-project/src/app.py']), [null, 'src/app.py']);
});

test('oversized and malformed manifests produce explicit safe warnings', () => {
  const oversized = 'x'.repeat(100_001);
  const report = analyzeProject({
    paths: ['package.json', 'requirements.txt'],
    manifests: { 'package.json': '{not-json}', 'requirements.txt': oversized },
  });
  assert.ok(report.warnings.some(w => w.includes('Invalid package.json')));
  assert.ok(report.warnings.some(w => w.includes('requirements.txt') && w.includes('size limit')));
  assert.ok(!JSON.stringify(report).includes('{not-json}'));
});

test('path inventory is bounded without retaining extra input data', () => {
  const report = analyzeProject({ paths: Array.from({ length: 5_001 }, (_, i) => `src/file-${i}.ts`) });
  assert.equal(report.filesSeen, 5_000);
  assert.ok(report.warnings.some(w => w.includes('path limit')));
});

test('security profiles produce deterministic requirements and checks', () => {
  const facts = analyzeProject({ paths: [] });
  const baseline = proposeBlueprint(facts, { target: 'codex', workType: 'coding' });
  const strict = proposeBlueprint(facts, { target: 'codex', workType: 'coding', securityProfile: 'strict' });
  assert.equal(baseline.security.profile, 'baseline');
  assert.equal(strict.security.profile, 'strict');
  assert.deepEqual(validateSecurityRequirements(baseline.security), []);
  assert.deepEqual(validateSecurityRequirements(strict.security), []);
  assert.ok(strict.security.securityTests.includes('prompt-injection'));
  assert.ok(strict.security.securityTests.includes('resource-limits'));
  assert.ok(strict.security.securityTests.length > baseline.security.securityTests.length);
});

test('invalid security requirements fail closed during artifact generation', () => {
  const facts = analyzeProject({ paths: [] });
  const blueprint = proposeBlueprint(facts, { target: 'codex', workType: 'coding' });
  const invalid = { ...blueprint, security: { ...blueprint.security, network: 'allow' } };
  assert.ok(validateSecurityRequirements(invalid.security).length > 0);
  const result = generateArtifacts(invalid);
  assert.equal(result.supported, false);
  assert.match(result.reason, /Network policy/);
});
test('output collision detection is safe and deterministic', () => {
  const files = [{ path: 'AGENTS.md', content: 'x' }, { path: '../escape', content: 'y' }];
  assert.deepEqual(findOutputCollisions(['AGENTS.md', '../escape', '.env'], files), ['AGENTS.md']);
});
test('malformed Blueprints fail closed before rendering', () => {
  const facts = analyzeProject({ paths: [] });
  const blueprint = proposeBlueprint(facts, { target: 'codex', workType: 'coding' });
  const invalid = { ...blueprint, extra: 'not allowed', agents: [], security: { ...blueprint.security, requiredApprovals: undefined } };
  assert.ok(validateBlueprint(invalid).some(problem => problem.includes('at least one agent')));
  assert.ok(validateBlueprint(invalid).some(problem => problem.includes('Required approvals')));
  assert.ok(validateBlueprint(invalid).some(problem => problem.includes('unknown field: extra')));
  const result = generateArtifacts(invalid);
  assert.equal(result.supported, false);
  assert.match(result.reason, /at least one agent/);
});
test('single agent default and review skill generation', () => {
  const facts=analyzeProject({paths:['src/app.ts','tests/app.test.ts']});
  const p=proposeBlueprint(facts,{target:'codex',workType:'coding',needsReview:true});
  assert.equal(p.agents.length,1);
  const result=generateArtifacts(p);
  assert.equal(result.supported,true);
  assert.deepEqual(validateArtifacts(result),[]);
  assert.ok(result.files.some(f=>f.path==='.agents/skills/code-review/SKILL.md'));
  const manifest = result.files.find(f => f.path === 'UAA-MANIFEST.json');
  assert.ok(manifest);
  assert.match(manifest.content, /"capabilityRegistryVersion": "0\.1"/);
  assert.match(manifest.content, /"verificationStatus": "partial"/);
  assert.ok(!manifest.content.includes('print("hello")'));
  assert.match(result.files.find(f=>f.path==='AGENTS.md').content,/short-lived branch/);
  assert.match(result.files.find(f=>f.path==='AGENTS.md').content,/explicit user approval/);
  assert.match(result.files.find(f=>f.path==='AGENTS.md').content,/Required security checks/);
  assert.match(result.files.find(f=>f.path==='.agents/skills/code-review/SKILL.md').content,/Do not access secrets/);
});

test('generation manifest validation fails closed for unsafe or inconsistent metadata', () => {
  const facts = analyzeProject({ paths: ['src/app.ts'] });
  const blueprint = proposeBlueprint(facts, { target: 'codex', workType: 'coding' });
  const generated = generateArtifacts(blueprint);
  const manifestFile = generated.files.find(file => file.path === 'UAA-MANIFEST.json');
  assert.ok(manifestFile);

  const withManifest = (changes) => ({
    ...generated,
    files: generated.files.map(file => file.path === 'UAA-MANIFEST.json'
      ? { ...file, content: JSON.stringify({ ...JSON.parse(manifestFile.content), ...changes }) }
      : file),
  });

  assert.ok(validateArtifacts(withManifest({ files: ['AGENTS.md', '../escape', 'UAA-MANIFEST.json'] })).some(problem => problem.includes('manifest')));
  assert.ok(validateArtifacts(withManifest({ files: ['AGENTS.md', 'AGENTS.md', 'UAA-MANIFEST.json'] })).some(problem => problem.includes('manifest')));
  assert.ok(validateArtifacts(withManifest({ files: ['UAA-MANIFEST.json'] })).some(problem => problem.includes('manifest')));
  assert.ok(validateArtifacts(withManifest({ sourceUrls: ['http://example.test'] })).some(problem => problem.includes('manifest')));
  assert.ok(validateArtifacts(withManifest({ sourceUrls: ['https://user:password@example.test'] })).some(problem => problem.includes('manifest')));
  assert.ok(validateArtifacts(withManifest({ securityProfile: 'unsafe' })).some(problem => problem.includes('manifest')));
  assert.ok(validateArtifacts(withManifest({ verificationStatus: 'verified-but-unknown' })).some(problem => problem.includes('manifest')));
});

test('unimplemented provider fails clearly instead of creating invalid files', () => {
  const f=analyzeProject({paths:[]});
  const result=generateArtifacts(proposeBlueprint(f,{target:'chatgpt',workType:'coding'}));
  assert.equal(result.supported,false);
  assert.equal(result.files.length,0);
});
