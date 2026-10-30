#!/usr/bin/env node
import { lstat, readdir, readFile, mkdir, writeFile, access, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeProject, proposeBlueprint, generateArtifacts, validateArtifacts, safeRelativePath, findOutputCollisions, findOutputConflicts } from '../dist/core.js';
import { analyzeAstSources } from '../dist/ast-analyzer.js';

const ignored = new Set(['node_modules', '.git', '.env', '.ssh', '.aws', '.npmrc', '.venv', 'venv', 'dist', 'coverage', 'build', '.next', 'secrets', 'private']);
const allowedHiddenDirectories = new Set(['.github', '.codex', '.agents']);
const manifestNames = ['package.json', 'pyproject.toml', 'requirements.txt'];
const MAX_DEPTH = 8;
const MAX_FILES = 5_000;
const AST_MAX_FILES = 100;
const AST_MAX_FILE_BYTES = 512_000;
const AST_MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const astAssets = {
  runtimeWasm: fileURLToPath(new URL('../node_modules/web-tree-sitter/web-tree-sitter.wasm', import.meta.url)),
  pythonWasm: fileURLToPath(new URL('../node_modules/tree-sitter-python/tree-sitter-python.wasm', import.meta.url)),
  typescriptWasm: fileURLToPath(new URL('../node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm', import.meta.url)),
};
async function scan(dir, { includeAst = false } = {}) {
  const rootStat = await lstat(dir);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Expected a non-symlink directory');
  const rootReal = await realpath(dir);
  const paths = []; const manifests = {}; const astSources = []; const warnings = []; const warningSet = new Set(); let count = 0; let astBytes = 0;
  const warn = message => { if (!warningSet.has(message)) { warningSet.add(message); warnings.push(message); } };
  const shouldSkip = entry => {
    const lower = entry.name.toLowerCase();
    return ignored.has(lower) || lower.startsWith('.env') || /\.(pem|key|p12|pfx)$/i.test(entry.name)
      || (entry.name.startsWith('.') && !allowedHiddenDirectories.has(lower));
  };
  const isInsideRoot = async candidate => {
    const resolved = await realpath(candidate).catch(() => null);
    if (!resolved || (resolved !== rootReal && !resolved.startsWith(rootReal + path.sep))) {
      warn('Skipped an entry outside the approved root.');
      return false;
    }
    return true;
  };
  async function walk(relative = '', depth = 0) {
    if (depth > MAX_DEPTH || count >= MAX_FILES) { warn('Inventory scan limit reached; additional entries were ignored.'); return; }
    let entries;
    try { entries = await readdir(path.join(dir, relative), { withFileTypes: true }); }
    catch { warn('Skipped an unreadable directory.'); return; }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (count >= MAX_FILES) { warn('Inventory scan limit reached; additional entries were ignored.'); return; }
      if (shouldSkip(entry)) continue;
      const r = relative ? `${relative}/${entry.name}` : entry.name;
      if (!safeRelativePath(r)) continue;
      const candidate = path.join(dir, r);
      const stat = await lstat(candidate).catch(() => null);
      if (!stat || stat.isSymbolicLink()) continue;
      if (!await isInsideRoot(candidate)) continue;
      if (stat.isDirectory()) {
        if (depth >= MAX_DEPTH) { warn('Inventory scan depth limit reached; deeper directories were ignored.'); continue; }
        await walk(r, depth + 1);
      }
      else if (stat.isFile()) {
        paths.push(r); count++;
        if (relative === '' && manifestNames.includes(entry.name) && stat.size <= 100_000) {
          try { manifests[entry.name] = await readFile(candidate, 'utf8'); }
          catch { warn('Skipped an unreadable manifest.'); }
        }
        if (includeAst && /\.(?:py|tsx?)$/i.test(r)) {
          if (astSources.length >= AST_MAX_FILES) warn('AST file limit reached; additional source files were ignored.');
          else if (stat.size > AST_MAX_FILE_BYTES) warn('Skipped an AST source exceeding the file size limit.');
          else if (astBytes + stat.size > AST_MAX_TOTAL_BYTES) warn('AST total source size limit reached; additional source files were ignored.');
          else {
            try { astSources.push({ path: r, content: await readFile(candidate, 'utf8') }); astBytes += stat.size; }
            catch { warn('Skipped an unreadable AST source.'); }
          }
        }
      }
    }
  }
  await walk(); return { paths, manifests, warnings, astSources };
}
async function main() {
  const [command = 'help', folder = '.', target = 'codex', securityProfile = 'baseline', ...options] = process.argv.slice(2);
  const dryRun = options.includes('--dry-run');
  const includeAst = options.includes('--ast');
  if (command !== 'analyze' && command !== 'generate') {
    console.log('Usage: npm run build && node scripts/cli.mjs analyze|generate <project-dir> [codex|other-target] [baseline|strict] [--dry-run] [--ast]');
    return;
  }
  if (options.some(option => !['--dry-run', '--ast'].includes(option)) || (dryRun && command !== 'generate')) throw new Error('Unsupported CLI option.');
  if (includeAst && command !== 'analyze') throw new Error('The --ast option is only available for analyze.');
  if (securityProfile !== 'baseline' && securityProfile !== 'strict') throw new Error('Security profile must be baseline or strict');
  const abs = path.resolve(folder);
  if (!(await lstat(abs)).isDirectory()) throw new Error('Expected a directory');
  const input = await scan(abs, { includeAst });
  const facts = analyzeProject(input);
  const blueprint = proposeBlueprint(facts, { target, workType: 'coding', needsReview: true, securityProfile });
  if (command === 'analyze') {
    const ast = includeAst ? await analyzeAstSources(input.astSources, { assets: astAssets }) : undefined;
    console.log(JSON.stringify({ facts, blueprint, ...(ast ? { ast } : {}) }, null, 2));
    return;
  }
  const rendered = generateArtifacts(blueprint);
  const issues = validateArtifacts(rendered);
  if (issues.length) throw new Error(issues.join('; '));
  const out = path.resolve('generated', path.basename(abs));
  const existingOutputPaths = [];
  for (const file of rendered.files) {
    const dest = path.join(out, file.path);
    try { await access(dest); existingOutputPaths.push(file.path); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  const collisions = findOutputCollisions(existingOutputPaths, rendered.files);
  if (dryRun) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      stagingRoot: path.relative(process.cwd(), out) || '.',
      facts,
      blueprint,
      rendering: {
        supported: rendered.supported,
        proposedFiles: rendered.files.map(file => file.path),
        collisions,
        projectConflicts: findOutputConflicts(input.paths, rendered.files),
        problems: validateArtifacts(rendered),
      },
    }, null, 2));
    return;
  }
  if (collisions.length) throw new Error(`Refusing overwrite: ${collisions.join(', ')}`);
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
