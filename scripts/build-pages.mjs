#!/usr/bin/env node
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '.pages');
const copy = async (source, destination) => {
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(root, source), destination);
};

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await copy('web/index.html', path.join(output, 'index.html'));
for (const file of await readdir(path.join(root, 'dist'))) {
  if (file.endsWith('.js')) await copy(`dist/${file}`, path.join(output, 'dist', file));
}
for (const file of await readdir(path.join(root, 'web'))) {
  if (file === 'vendor' || file === 'index.html') continue;
  if (file.endsWith('.mjs')) await copy(`web/${file}`, path.join(output, 'web', file));
}
for (const file of await readdir(path.join(root, 'web', 'vendor'))) {
  if (file.endsWith('.js') || file.endsWith('.wasm')) await copy(`web/vendor/${file}`, path.join(output, 'web', 'vendor', file));
}
console.log(`Prepared static Pages package in ${path.relative(root, output)}.`);
