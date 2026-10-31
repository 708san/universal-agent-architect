import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('../scripts/cli.mjs', import.meta.url));

test('CLI excludes private files, never modifies source and refuses overwrite', async () => {
  const root = await mkdtemp(path.join(tmpdir(),'uaa-'));
  const project = path.join(root,'project');
  try {
    await mkdir(path.join(project,'src'),{recursive:true});
    await writeFile(path.join(project,'src','app.py'),'print("hello")\n');
    await writeFile(path.join(project,'requirements.txt'),'fastapi==0.1\n');
    await writeFile(path.join(project,'.env.local'),'PRIVATE=never_echo_me\n');
    await symlink(path.join(root,'missing-outside-file'),path.join(project,'external-symlink'));
    await mkdir(path.join(root, 'outside'), { recursive: true });
    await writeFile(path.join(root, 'outside', 'outside-secret.txt'), 'outside data');
    await symlink(path.join(root, 'outside'), path.join(project, 'external-directory'));
    const analyze = spawnSync(process.execPath,[cli,'analyze',project,'codex'],{cwd:root,encoding:'utf8'});
    assert.equal(analyze.status,0,analyze.stderr);
    assert.ok(!analyze.stdout.includes('never_echo_me'));
    assert.ok(!analyze.stdout.includes('outside-secret.txt'));
    assert.equal(JSON.parse(analyze.stdout).facts.filesSeen,2);
    const first = spawnSync(process.execPath,[cli,'generate',project,'codex'],{cwd:root,encoding:'utf8'});
    assert.equal(first.status,0,first.stderr);
    assert.deepEqual((await readdir(project)).sort(),['.env.local','external-directory','external-symlink','requirements.txt','src'].sort());
    assert.match(await readFile(path.join(root,'generated','project','AGENTS.md'),'utf8'),/Project instructions/);
    const second = spawnSync(process.execPath,[cli,'generate',project,'codex'],{cwd:root,encoding:'utf8'});
    assert.notEqual(second.status,0);
    assert.match(second.stderr,/Refusing overwrite/);
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('CLI skips hidden directories and limits traversal depth', async () => {
  const root = await mkdtemp(path.join(tmpdir(),'uaa-'));
  const project = path.join(root,'project');
  try {
    await mkdir(path.join(project, '.hidden'), { recursive: true });
    await writeFile(path.join(project, '.hidden', 'secret.txt'), 'do not inventory');
    await mkdir(path.join(project, '.github', 'workflows'), { recursive: true });
    await writeFile(path.join(project, '.github', 'workflows', 'ci.yml'), 'name: CI\n');
    await mkdir(path.join(project, '.agents', 'skills', 'review'), { recursive: true });
    await writeFile(path.join(project, '.agents', 'skills', 'review', 'SKILL.md'), '---\nname: review\n---\n');
    await mkdir(path.join(project, '.codex'), { recursive: true });
    await writeFile(path.join(project, '.codex', 'config.toml'), 'approval_policy = "never"\n');
    let nested = project;
    for (let index = 0; index < 9; index++) {
      nested = path.join(nested, `level-${index}`);
      await mkdir(nested);
    }
    await writeFile(path.join(nested, 'too-deep.ts'), 'not read');
    const analyze = spawnSync(process.execPath, [cli, 'analyze', project, 'codex'], { cwd: root, encoding: 'utf8' });
    assert.equal(analyze.status, 0, analyze.stderr);
    const output = JSON.parse(analyze.stdout);
    assert.ok(output.facts.hasGitHubActions);
    assert.deepEqual(output.facts.existingSkillPaths, ['.agents/skills/review/SKILL.md']);
    assert.deepEqual(output.facts.existingSettingsPaths, ['.codex/config.toml']);
    assert.ok(!output.facts.warnings.some(warning => warning.includes('secret.txt')));
    assert.ok(output.facts.warnings.some(warning => warning.includes('depth limit')));
    assert.ok(!output.facts.warnings.some(warning => warning.includes('too-deep.ts')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('CLI bounds directory enumeration and reports truncation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'uaa-'));
  const project = path.join(root, 'project');
  try {
    await mkdir(project, { recursive: true });
    for (let index = 0; index < 1_025; index++) {
      await writeFile(path.join(project, `ignored-${String(index).padStart(4, '0')}.txt`), 'metadata only');
    }
    const analyze = spawnSync(process.execPath, [cli, 'analyze', project, 'codex'], { cwd: root, encoding: 'utf8' });
    assert.equal(analyze.status, 0, analyze.stderr);
    const output = JSON.parse(analyze.stdout);
    assert.equal(output.facts.filesSeen, 1_024);
    assert.ok(output.facts.warnings.some(warning => warning.includes('Directory entry limit')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('CLI dry-run reports output collisions without writing', async () => {
  const root = await mkdtemp(path.join(tmpdir(),'uaa-'));
  const project = path.join(root, 'project');
  try {
    await mkdir(project, { recursive: true });
    await writeFile(path.join(project, 'AGENTS.md'), 'existing project instructions');
    const generated = path.join(root, 'generated', 'project');
    await mkdir(generated, { recursive: true });
    await writeFile(path.join(generated, 'AGENTS.md'), 'existing instructions');
    const run = spawnSync(process.execPath, [cli, 'generate', project, 'codex', 'baseline', '--dry-run'], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const output = JSON.parse(run.stdout);
    assert.equal(output.mode, 'dry-run');
    assert.deepEqual(output.rendering.collisions, ['AGENTS.md']);
    assert.deepEqual(output.rendering.projectConflicts, [{ path: 'AGENTS.md', category: 'instruction' }]);
    assert.ok(output.rendering.proposedFiles.includes('AGENTS.md'));
    assert.equal(await readFile(path.join(generated, 'AGENTS.md'), 'utf8'), 'existing instructions');
    assert.deepEqual((await readdir(generated)).sort(), ['AGENTS.md']);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('CLI config review reports safe statuses and dry-run changes without source content', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'uaa-'));
  const project = path.join(root, 'project');
  try {
    await mkdir(path.join(project, '.agents', 'skills', 'review'), { recursive: true });
    await mkdir(path.join(project, '.codex', 'agents'), { recursive: true });
    await writeFile(path.join(project, '.agents', 'skills', 'review', 'SKILL.md'), '---\nname: review\ndescription: Review changes.\n---\nsecret skill instructions');
    await writeFile(path.join(project, '.codex', 'agents', 'reviewer.toml'), 'name = "wrong"\ndescription = "do-not-report"\n');
    await writeFile(path.join(project, 'AGENTS.md'), 'do-not-report instruction');
    const analyze = spawnSync(process.execPath, [cli, 'analyze', project, 'codex', 'baseline', '--config'], { cwd: root, encoding: 'utf8' });
    assert.equal(analyze.status, 0, analyze.stderr);
    const analyzed = JSON.parse(analyze.stdout);
    assert.ok(analyzed.existingConfig.findings.some(finding => finding.status === 'valid'));
    assert.ok(analyzed.existingConfig.findings.some(finding => finding.status === 'malformed'));
    assert.ok(!analyze.stdout.includes('do-not-report'));

    const dryRun = spawnSync(process.execPath, [cli, 'generate', project, 'codex', 'baseline', '--dry-run'], { cwd: root, encoding: 'utf8' });
    assert.equal(dryRun.status, 0, dryRun.stderr);
    const output = JSON.parse(dryRun.stdout);
    assert.ok(output.rendering.changes.some(change => change.path === 'AGENTS.md' && change.action === 'replace'));
    assert.ok(output.existingConfig.findings.length >= 3);
    assert.ok(!dryRun.stdout.includes('secret skill instructions'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('CLI apply previews without consent and rollback restores the previous project', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'uaa-'));
  const project = path.join(root, 'project');
  try {
    await mkdir(project, { recursive: true });
    await writeFile(path.join(project, 'AGENTS.md'), 'original instructions');
    const generate = spawnSync(process.execPath, [cli, 'generate', project, 'codex'], { cwd: root, encoding: 'utf8' });
    assert.equal(generate.status, 0, generate.stderr);
    const staging = path.join(root, 'generated', 'project');

    const preview = spawnSync(process.execPath, [cli, 'apply', project, '--staging=generated/project'], { cwd: root, encoding: 'utf8' });
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(JSON.parse(preview.stdout).mode, 'apply-preview');
    assert.equal(await readFile(path.join(project, 'AGENTS.md'), 'utf8'), 'original instructions');

    const applied = spawnSync(process.execPath, [cli, 'apply', project, '--staging=generated/project', '--confirm'], { cwd: root, encoding: 'utf8' });
    assert.equal(applied.status, 0, applied.stderr);
    const appliedOutput = JSON.parse(applied.stdout);
    assert.equal(appliedOutput.mode, 'applied');
    assert.notEqual(await readFile(path.join(project, 'AGENTS.md'), 'utf8'), 'original instructions');
    assert.ok(appliedOutput.changes.some(change => change.path === 'AGENTS.md' && change.action === 'replace'));

    const rollbackPreview = spawnSync(process.execPath, [cli, 'rollback', project, '--staging=generated/project', `--rollback-id=${appliedOutput.rollbackId}`], { cwd: root, encoding: 'utf8' });
    assert.equal(rollbackPreview.status, 0, rollbackPreview.stderr);
    assert.equal(JSON.parse(rollbackPreview.stdout).mode, 'rollback-preview');
    const rollback = spawnSync(process.execPath, [cli, 'rollback', project, '--staging=generated/project', `--rollback-id=${appliedOutput.rollbackId}`, '--confirm'], { cwd: root, encoding: 'utf8' });
    assert.equal(rollback.status, 0, rollback.stderr);
    assert.equal(JSON.parse(rollback.stdout).mode, 'rolled-back');
    assert.equal(await readFile(path.join(project, 'AGENTS.md'), 'utf8'), 'original instructions');
    await readFile(path.join(staging, '.uaa-rollback', appliedOutput.rollbackId, 'ROLLBACK.json'), 'utf8');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('CLI apply rejects staging paths outside generated and unsafe manifests', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'uaa-'));
  const project = path.join(root, 'project');
  try {
    await mkdir(project, { recursive: true });
    const outside = path.join(root, 'outside');
    await mkdir(outside, { recursive: true });
    const outsideRun = spawnSync(process.execPath, [cli, 'apply', project, `--staging=${outside}`], { cwd: root, encoding: 'utf8' });
    assert.notEqual(outsideRun.status, 0);
    assert.match(outsideRun.stderr, /inside generated/);

    const generate = spawnSync(process.execPath, [cli, 'generate', project, 'codex'], { cwd: root, encoding: 'utf8' });
    assert.equal(generate.status, 0, generate.stderr);
    await symlink(outside, path.join(root, 'generated', 'project', '.uaa-rollback'));
    const symlinkRun = spawnSync(process.execPath, [cli, 'apply', project, '--staging=generated/project', '--confirm'], { cwd: root, encoding: 'utf8' });
    assert.notEqual(symlinkRun.status, 0);
    assert.match(symlinkRun.stderr, /Rollback directory is unsafe/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
