#!/usr/bin/env node
import { lstat, readdir, readFile, mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { analyzeProject, proposeBlueprint, generateArtifacts, validateArtifacts, safeRelativePath } from '../dist/core.js';

const ignored = new Set(['node_modules', '.git', '.env', '.ssh', '.venv', 'venv', 'dist', 'coverage', 'build', '.next']);
const manifestNames = ['package.json', 'pyproject.toml', 'requirements.txt'];
async function scan(dir) {
  const paths = []; const manifests = {}; let count = 0;
  async function walk(relative = '', depth = 0) {
    if (depth > 8 || count > 5000) return;
    for (const entry of await readdir(path.join(dir, relative), { withFileTypes: true })) {
      if (ignored.has(entry.name) || entry.name.startsWith('.env') || entry.name.endsWith('.pem') || entry.name.endsWith('.key')) continue;
      const r = relative ? `${relative}/${entry.name}` : entry.name;
      if (!safeRelativePath(r)) continue;
      const stat = await lstat(path.join(dir, r));
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) await walk(r, depth + 1);
      else if (stat.isFile()) {
        paths.push(r); count++;
        if (relative === '' && manifestNames.includes(entry.name) && stat.size <= 100_000) {
          manifests[entry.name] = await readFile(path.join(dir, r), 'utf8');
        }
      }
    }
  }
  await walk(); return { paths, manifests };
}
async function main() {
  const [command = 'help', folder = '.', target = 'codex'] = process.argv.slice(2);
  if (command !== 'analyze' && command !== 'generate') {
    console.log('Usage: npm run build && node scripts/cli.mjs analyze|generate <project-dir> [codex|other-target]');
    return;
  }
  const abs = path.resolve(folder);
  if (!(await lstat(abs)).isDirectory()) throw new Error('Expected a directory');
  const input = await scan(abs);
  const facts = analyzeProject(input);
  const blueprint = proposeBlueprint(facts, { target, workType: 'coding', needsReview: true });
  if (command === 'analyze') { console.log(JSON.stringify({ facts, blueprint }, null, 2)); return; }
  const rendered = generateArtifacts(blueprint);
  const issues = validateArtifacts(rendered);
  if (issues.length) throw new Error(issues.join('; '));
  const out = path.resolve('generated', path.basename(abs));
  for (const file of rendered.files) {
    if (!safeRelativePath(file.path)) throw new Error('Unsafe path');
    const dest = path.join(out, file.path);
    await mkdir(path.dirname(dest), { recursive: true });
    try { await access(dest); throw new Error(`Refusing overwrite: ${dest}`); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    await writeFile(dest, file.content, { flag: 'wx' });
  }
  console.log(`Generated ${rendered.files.length} files in ${out}. Review them; nothing was applied to the source project.`);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
