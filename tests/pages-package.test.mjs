import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, rm, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve('.');
const pages = path.join(root, '.pages');

test('Pages package contains only the static browser allowlist', async () => {
  execFileSync(process.execPath, ['scripts/build-pages.mjs'], { cwd: root, encoding: 'utf8' });
  try {
    const index = await readFile(path.join(pages, 'index.html'), 'utf8');
    assert.match(index, /http-equiv="Content-Security-Policy"/);
    assert.match(index, /connect-src 'none'/);
    assert.match(index, /src="\.\/web\/app\.mjs"/);
    assert.match(index, /"\.\/web\/vendor\/web-tree-sitter\.js"/);
    assert.doesNotMatch(index, /src="\//);
    assert.deepEqual((await readdir(pages)).sort(), ['dist', 'index.html', 'web']);
    for (const file of ['core.js', 'ast-analyzer.js']) assert.ok((await stat(path.join(pages, 'dist', file))).isFile());
    for (const file of ['app.mjs', 'browser-input.mjs', 'browser-zip.mjs']) assert.ok((await stat(path.join(pages, 'web', file))).isFile());
    for (const file of ['web-tree-sitter.js', 'web-tree-sitter.wasm', 'tree-sitter-python.wasm', 'tree-sitter-typescript.wasm']) {
      assert.ok((await stat(path.join(pages, 'web', 'vendor', file))).isFile());
    }
    await assert.rejects(stat(path.join(pages, 'package.json')));
    await assert.rejects(stat(path.join(pages, 'src')));
  } finally {
    await rm(pages, { recursive: true, force: true });
  }
});

test('Pages workflow keeps deployment permissions and actions bounded', async () => {
  const workflow = await readFile(path.join(root, '.github', 'workflows', 'pages.yml'), 'utf8');
  assert.match(workflow, /actions\/upload-pages-artifact@v3/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
  assert.doesNotMatch(workflow, /secrets\./);
});
