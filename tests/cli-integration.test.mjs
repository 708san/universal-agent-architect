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
    const analyze = spawnSync(process.execPath,[cli,'analyze',project,'codex'],{cwd:root,encoding:'utf8'});
    assert.equal(analyze.status,0,analyze.stderr);
    assert.ok(!analyze.stdout.includes('never_echo_me'));
    assert.equal(JSON.parse(analyze.stdout).facts.filesSeen,2);
    const first = spawnSync(process.execPath,[cli,'generate',project,'codex'],{cwd:root,encoding:'utf8'});
    assert.equal(first.status,0,first.stderr);
    assert.deepEqual((await readdir(project)).sort(),['.env.local','external-symlink','requirements.txt','src'].sort());
    assert.match(await readFile(path.join(root,'generated','project','AGENTS.md'),'utf8'),/Project instructions/);
    const second = spawnSync(process.execPath,[cli,'generate',project,'codex'],{cwd:root,encoding:'utf8'});
    assert.notEqual(second.status,0);
    assert.match(second.stderr,/Refusing overwrite/);
  } finally { await rm(root,{recursive:true,force:true}); }
});
