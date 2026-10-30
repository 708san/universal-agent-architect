import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { analyzeAstSources } from '../dist/ast-analyzer.js';

const assets = {
  runtimeWasm: path.resolve('node_modules/web-tree-sitter/web-tree-sitter.wasm'),
  pythonWasm: path.resolve('node_modules/tree-sitter-python/tree-sitter-python.wasm'),
  typescriptWasm: path.resolve('node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm'),
};

test('bounded AST analyzer returns deterministic structural facts only', async () => {
  const sources = [
    { path: 'src/app.py', content: 'import os\n\nclass App:\n    def run(self):\n        return 1\n' },
    { path: 'src/app.ts', content: 'import { value } from "./value";\nexport interface App { value: number }\nexport function run(): number { return value; }\n' },
  ];
  const first = await analyzeAstSources(sources, { assets });
  const second = await analyzeAstSources(sources, { assets });
  assert.deepEqual(first, second);
  assert.deepEqual(first.files, [
    { path: 'src/app.py', language: 'python', syntax: 'ok', declarationCount: 2, importCount: 1 },
    { path: 'src/app.ts', language: 'typescript', syntax: 'ok', declarationCount: 2, importCount: 1 },
  ]);
  assert.equal(first.bytesSeen, new TextEncoder().encode(sources[0].content).byteLength + new TextEncoder().encode(sources[1].content).byteLength);
  assert.ok(!JSON.stringify(first).includes('return 1'));
});

test('AST analyzer fails closed for unsafe, unsupported, malformed and oversized inputs', async () => {
  const result = await analyzeAstSources([
    { path: '../secret.py', content: 'print("secret")' },
    { path: 'src/app.js', content: 'function ignored() {}' },
    { path: 'src/broken.py', content: 'def broken(:\n  pass' },
    { path: 'src/too-large.py', content: 'x'.repeat(100) },
  ], { assets, maxFileBytes: 32 });
  assert.deepEqual(result.files, [
    { path: 'src/broken.py', language: 'python', syntax: 'error', declarationCount: 1, importCount: 0 },
  ]);
  assert.ok(result.warnings.length >= 3);
  assert.ok(!JSON.stringify(result).includes('secret'));
});

test('AST analyzer enforces file and total byte limits', async () => {
  const result = await analyzeAstSources([
    { path: 'a.py', content: 'x = 1' },
    { path: 'b.py', content: 'y = 2' },
    { path: 'c.py', content: 'z = 3' },
  ], { assets, maxFiles: 2, maxTotalBytes: 6 });
  assert.equal(result.filesSeen, 2);
  assert.ok(result.files.length <= 2);
  assert.ok(result.warnings.some(warning => /limit/.test(warning)));
});

test('AST analyzer rejects remote assets and malformed source objects without disclosure', async () => {
  const remote = await analyzeAstSources([{ path: 'src/app.py', content: 'print("local")' }], {
    assets: { runtimeWasm: 'https://example.invalid/tree-sitter.wasm' },
  });
  assert.deepEqual(remote.files, []);
  assert.ok(remote.warnings.some(warning => /Remote AST runtime/.test(warning)));

  const malformed = await analyzeAstSources([
    null,
    { path: 123, content: 'print("secret")' },
  ], { assets });
  assert.deepEqual(malformed.files, []);
  assert.ok(malformed.warnings.every(warning => /invalid shape/.test(warning)));
  assert.ok(!JSON.stringify(malformed).includes('secret'));
});
