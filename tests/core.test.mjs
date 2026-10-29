import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { analyzeProject, normalizeBrowserRelativePaths, safeRelativePath, proposeBlueprint, generateArtifacts, validateArtifacts } from '../dist/core.js';

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
test('single agent default and review skill generation', () => {
  const facts=analyzeProject({paths:['src/app.ts','tests/app.test.ts']});
  const p=proposeBlueprint(facts,{target:'codex',workType:'coding',needsReview:true});
  assert.equal(p.agents.length,1);
  const result=generateArtifacts(p);
  assert.equal(result.supported,true);
  assert.deepEqual(validateArtifacts(result),[]);
  assert.ok(result.files.some(f=>f.path==='.agents/skills/code-review/SKILL.md'));
  assert.match(result.files.find(f=>f.path==='AGENTS.md').content,/short-lived branch/);
  assert.match(result.files.find(f=>f.path==='AGENTS.md').content,/explicit user approval/);
  assert.match(result.files.find(f=>f.path==='.agents/skills/code-review/SKILL.md').content,/Do not access secrets/);
});
test('unimplemented provider fails clearly instead of creating invalid files', () => {
  const f=analyzeProject({paths:[]});
  const result=generateArtifacts(proposeBlueprint(f,{target:'chatgpt',workType:'coding'}));
  assert.equal(result.supported,false);
  assert.equal(result.files.length,0);
});
