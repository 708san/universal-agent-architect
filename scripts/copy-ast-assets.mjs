#!/usr/bin/env node
import { copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'web', 'vendor');
const assets = [
  ['node_modules/web-tree-sitter/web-tree-sitter.js', 'web-tree-sitter.js'],
  ['node_modules/web-tree-sitter/web-tree-sitter.wasm', 'web-tree-sitter.wasm'],
  ['node_modules/tree-sitter-python/tree-sitter-python.wasm', 'tree-sitter-python.wasm'],
  ['node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm', 'tree-sitter-typescript.wasm'],
];

await mkdir(output, { recursive: true });
for (const [relativeSource, filename] of assets) {
  const source = path.join(root, relativeSource);
  const sourceStat = await stat(source);
  if (!sourceStat.isFile()) throw new Error(`AST asset is not a regular file: ${relativeSource}`);
  await copyFile(source, path.join(output, filename));
}
console.log(`Prepared ${assets.length} local AST browser assets in ${path.relative(root, output)}.`);
