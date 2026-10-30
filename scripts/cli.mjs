#!/usr/bin/env node
import { lstat, readdir, readFile, mkdir, writeFile, access, realpath, copyFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeProject, proposeBlueprint, generateArtifacts, validateArtifacts, safeRelativePath, findOutputCollisions, findOutputConflicts, findOutputChanges } from '../dist/core.js';
import { analyzeAstSources } from '../dist/ast-analyzer.js';
import { inspectExistingCodexConfig } from '../dist/existing-config.js';
import { createApplyPlan, createRollbackRecord } from '../dist/apply.js';
import { inspectMcpConfig } from '../dist/mcp-config.js';

const ignored = new Set(['node_modules', '.git', '.env', '.ssh', '.aws', '.npmrc', '.venv', 'venv', 'dist', 'coverage', 'build', '.next', 'secrets', 'private']);
const allowedHiddenDirectories = new Set(['.github', '.codex', '.agents', '.gemini']);
const manifestNames = ['package.json', 'pyproject.toml', 'requirements.txt'];
const MAX_DEPTH = 8;
const MAX_FILES = 5_000;
const AST_MAX_FILES = 100;
const AST_MAX_FILE_BYTES = 512_000;
const AST_MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const CONFIG_MAX_FILE_BYTES = 100_000;
const astAssets = {
  runtimeWasm: fileURLToPath(new URL('../node_modules/web-tree-sitter/web-tree-sitter.wasm', import.meta.url)),
  pythonWasm: fileURLToPath(new URL('../node_modules/tree-sitter-python/tree-sitter-python.wasm', import.meta.url)),
  typescriptWasm: fileURLToPath(new URL('../node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm', import.meta.url)),
};
const isConfigPath = relativePath => /(^|\/)(?:AGENTS(?:\.override)?|CLAUDE|GEMINI)\.md$/i.test(relativePath)
  || /(^|\/)(?:\.agents\/skills|skills)\/[^/]+\/SKILL\.md$/i.test(relativePath)
  || /^\.codex\/(?:config\.toml|agents\/[^/]+\.toml)$/i.test(relativePath);
const isMcpConfigPath = relativePath => relativePath === '.mcp.json' || relativePath === '.gemini/settings.json' || relativePath === '.codex/config.toml';

function optionValue(options, prefix) {
  return options.find(option => option.startsWith(`${prefix}=`))?.slice(prefix.length + 1);
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function ensureNoSymlinkParents(root, relativePath) {
  let current = root;
  for (const segment of relativePath.split('/').slice(0, -1)) {
    current = path.join(current, segment);
    const stat = await lstat(current).catch(() => null);
    if (stat?.isSymbolicLink()) throw new Error(`Refusing symlinked staging parent: ${relativePath}`);
    if (stat && !stat.isDirectory()) throw new Error(`Staging parent is not a directory: ${relativePath}`);
  }
}

async function loadStaging(stagingArgument) {
  const generatedRoot = path.resolve('generated');
  const staging = path.resolve(stagingArgument);
  if (!isWithin(generatedRoot, staging)) throw new Error('Staging directory must be inside generated/.');
  const stagingStat = await lstat(staging).catch(() => null);
  if (!stagingStat?.isDirectory() || stagingStat.isSymbolicLink()) throw new Error('Expected a non-symlink staging directory.');
  const manifestPath = path.join(staging, 'UAA-MANIFEST.json');
  const manifestStat = await lstat(manifestPath).catch(() => null);
  if (!manifestStat?.isFile() || manifestStat.isSymbolicLink()) throw new Error('Staging manifest is missing or unsafe.');
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); }
  catch { throw new Error('Staging manifest is invalid JSON.'); }
  if (!Array.isArray(manifest.files) || !manifest.files.includes('UAA-MANIFEST.json')) throw new Error('Staging manifest file list is invalid.');
  const files = [];
  for (const filePath of manifest.files) {
    if (typeof filePath !== 'string' || safeRelativePath(filePath) !== filePath) throw new Error('Staging contains an unsafe artifact path.');
    await ensureNoSymlinkParents(staging, filePath);
    const file = path.join(staging, filePath);
    const stat = await lstat(file).catch(() => null);
    if (!stat?.isFile() || stat.isSymbolicLink()) throw new Error(`Staging artifact is missing or unsafe: ${filePath}`);
    files.push({ path: filePath, content: await readFile(file, 'utf8') });
  }
  const rendered = { supported: true, files };
  const problems = validateArtifacts(rendered);
  if (problems.length) throw new Error(`Invalid staging artifacts: ${problems.join('; ')}`);
  return { staging, rendered };
}

async function safeProjectRoot(projectArgument) {
  const project = path.resolve(projectArgument);
  const stat = await lstat(project).catch(() => null);
  if (!stat?.isDirectory() || stat.isSymbolicLink()) throw new Error('Project root must be an existing non-symlink directory.');
  return { project, real: await realpath(project) };
}

async function safeDestination(root, relativePath) {
  if (safeRelativePath(relativePath) !== relativePath) throw new Error('Unsafe apply path.');
  const segments = relativePath.split('/');
  let current = root;
  for (const segment of segments.slice(0, -1)) {
    current = path.join(current, segment);
    const stat = await lstat(current).catch(() => null);
    if (stat?.isSymbolicLink()) throw new Error(`Refusing symlinked apply parent: ${relativePath}`);
    if (stat && !stat.isDirectory()) throw new Error(`Apply parent is not a directory: ${relativePath}`);
  }
  const destination = path.join(root, ...segments);
  const stat = await lstat(destination).catch(() => null);
  if (stat?.isSymbolicLink()) throw new Error(`Refusing symlinked apply target: ${relativePath}`);
  if (stat && !stat.isFile()) throw new Error(`Apply target is not a regular file: ${relativePath}`);
  return destination;
}

async function ensureParent(destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  const parentStat = await lstat(path.dirname(destination));
  if (parentStat.isSymbolicLink() || !parentStat.isDirectory()) throw new Error('Apply parent became unsafe.');
}

async function atomicWrite(destination, content, token) {
  await ensureParent(destination);
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.uaa-${token}`);
  try {
    await writeFile(temporary, content, { flag: 'wx' });
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function applyStaged(projectArgument, stagingArgument, confirm) {
  const { project } = await safeProjectRoot(projectArgument);
  const { staging, rendered } = await loadStaging(stagingArgument);
  const inventory = await scan(project);
  const plan = createApplyPlan(inventory.paths, rendered.files);
  if (!confirm) {
    console.log(JSON.stringify({ mode: 'apply-preview', stagingRoot: path.relative(process.cwd(), staging), changes: plan.changes, confirmation: 'Re-run with --confirm to apply.' }, null, 2));
    return;
  }
  const rollbackId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const rollbackBase = path.join(staging, '.uaa-rollback');
  const rollbackBaseStat = await lstat(rollbackBase).catch(() => null);
  if (rollbackBaseStat?.isSymbolicLink() || (rollbackBaseStat && !rollbackBaseStat.isDirectory())) throw new Error('Rollback directory is unsafe.');
  await mkdir(rollbackBase, { recursive: true });
  const rollbackRoot = path.join(staging, '.uaa-rollback', rollbackId);
  if (await lstat(rollbackRoot).catch(() => null)) throw new Error('Rollback ID already exists.');
  const backupPaths = new Map();
  for (const change of plan.changes.filter(item => item.action === 'replace')) {
    const destination = await safeDestination(project, change.path);
    const backupPath = path.join(rollbackRoot, change.path);
    await mkdir(path.dirname(backupPath), { recursive: true });
    await copyFile(destination, backupPath);
    backupPaths.set(change.path, path.relative(staging, backupPath));
  }
  const rollback = createRollbackRecord(plan, filePath => backupPaths.get(filePath));
  await mkdir(rollbackRoot, { recursive: true });
  await writeFile(path.join(rollbackRoot, 'ROLLBACK.json'), `${JSON.stringify(rollback, null, 2)}\n`, { flag: 'wx' });
  for (const artifact of plan.artifacts) {
    const destination = await safeDestination(project, artifact.path);
    await atomicWrite(destination, artifact.content, rollbackId);
  }
  console.log(JSON.stringify({ mode: 'applied', rollbackId, stagingRoot: path.relative(process.cwd(), staging), changes: plan.changes }, null, 2));
}

async function rollbackStaged(projectArgument, stagingArgument, rollbackId, confirm) {
  if (!rollbackId || !/^[a-z0-9-]+$/.test(rollbackId)) throw new Error('A valid --rollback-id is required.');
  const { project } = await safeProjectRoot(projectArgument);
  const { staging } = await loadStaging(stagingArgument);
  const rollbackRoot = path.join(staging, '.uaa-rollback', rollbackId);
  const recordPath = path.join(rollbackRoot, 'ROLLBACK.json');
  await ensureNoSymlinkParents(staging, path.relative(staging, recordPath));
  let record;
  try { record = JSON.parse(await readFile(recordPath, 'utf8')); }
  catch { throw new Error('Rollback record is missing or invalid.'); }
  if (record.version !== '0.1' || !Array.isArray(record.entries)) throw new Error('Rollback record shape is invalid.');
  const entries = record.entries;
  for (const entry of entries) {
    if (!entry || safeRelativePath(entry.path) !== entry.path || !['restore', 'remove'].includes(entry.action)) throw new Error('Rollback record contains an unsafe entry.');
    if (entry.action === 'restore' && (typeof entry.backupPath !== 'string' || safeRelativePath(entry.backupPath) !== entry.backupPath || !entry.backupPath.startsWith('.uaa-rollback/'))) throw new Error('Rollback backup path is unsafe.');
    if (entry.action === 'restore') await ensureNoSymlinkParents(staging, entry.backupPath);
  }
  if (!confirm) {
    console.log(JSON.stringify({ mode: 'rollback-preview', rollbackId, changes: entries.map(entry => ({ path: entry.path, action: entry.action })), confirmation: 'Re-run with --confirm to rollback.' }, null, 2));
    return;
  }
  for (const entry of entries) {
    const destination = await safeDestination(project, entry.path);
    if (entry.action === 'restore') {
      const backup = path.join(staging, entry.backupPath);
      const backupStat = await lstat(backup).catch(() => null);
      if (!backupStat?.isFile() || backupStat.isSymbolicLink()) throw new Error(`Rollback backup is missing or unsafe: ${entry.path}`);
      await atomicWrite(destination, await readFile(backup, 'utf8'), rollbackId);
    } else {
      const current = await lstat(destination).catch(() => null);
      if (current?.isSymbolicLink()) throw new Error(`Refusing symlinked rollback target: ${entry.path}`);
      if (current) await rm(destination);
    }
  }
  console.log(JSON.stringify({ mode: 'rolled-back', rollbackId, changes: entries.map(entry => ({ path: entry.path, action: entry.action })) }, null, 2));
}
async function scan(dir, { includeAst = false, includeConfig = false, includeMcpConfig = false } = {}) {
  const rootStat = await lstat(dir);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Expected a non-symlink directory');
  const rootReal = await realpath(dir);
  const paths = []; const manifests = {}; const astSources = []; const configSources = []; const mcpSources = []; const warnings = []; const warningSet = new Set(); let count = 0; let astBytes = 0;
  const warn = message => { if (!warningSet.has(message)) { warningSet.add(message); warnings.push(message); } };
  const shouldSkip = entry => {
    const lower = entry.name.toLowerCase();
    return ignored.has(lower) || lower.startsWith('.env') || /\.(pem|key|p12|pfx)$/i.test(entry.name)
      || (entry.name.startsWith('.') && lower !== '.mcp.json' && !allowedHiddenDirectories.has(lower))
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
        if (includeConfig && isConfigPath(r)) {
          if (stat.size > CONFIG_MAX_FILE_BYTES) warn('Skipped an existing-config file exceeding the size limit.');
          else {
            try { configSources.push({ path: r, content: await readFile(candidate, 'utf8') }); }
            catch { warn('Skipped an unreadable existing-config file.'); }
          }
        }
        if (includeMcpConfig && isMcpConfigPath(r)) {
          if (stat.size > CONFIG_MAX_FILE_BYTES) warn('Skipped an MCP config exceeding the size limit.');
          else {
            try { mcpSources.push({ path: r, content: await readFile(candidate, 'utf8') }); }
            catch { warn('Skipped an unreadable MCP config.'); }
          }
        }
      }
    }
  }
  await walk(); return { paths, manifests, warnings, astSources, configSources, mcpSources };
}
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'help';
  const folder = args[1] ?? '.';
  const target = command === 'analyze' || command === 'generate' ? (args[2] ?? 'codex') : 'codex';
  const securityProfile = command === 'analyze' || command === 'generate' ? (args[3] ?? 'baseline') : 'baseline';
  const options = command === 'analyze' || command === 'generate' ? args.slice(4) : args.slice(2);
  const dryRun = options.includes('--dry-run');
  const includeAst = options.includes('--ast');
  const includeConfig = options.includes('--config') || (dryRun && command === 'generate');
  const includeMcpConfig = options.includes('--mcp-config');
  const confirm = options.includes('--confirm');
  const stagingArgument = optionValue(options, '--staging');
  const rollbackId = optionValue(options, '--rollback-id');
  if (command !== 'analyze' && command !== 'generate') {
    if (command !== 'apply' && command !== 'rollback') {
      console.log('Usage: npm run build && node scripts/cli.mjs analyze|generate <project-dir> [codex|other-target] [baseline|strict] [--dry-run] [--ast] [--config] [--mcp-config]\n       node scripts/cli.mjs apply <project-dir> --staging=generated/project [--confirm]\n       node scripts/cli.mjs rollback <project-dir> --staging=generated/project --rollback-id=<id> [--confirm]');
      return;
    }
  }
  const knownOptions = ['--dry-run', '--ast', '--config', '--mcp-config', '--confirm'];
  if (options.some(option => !knownOptions.includes(option) && !option.startsWith('--staging=') && !option.startsWith('--rollback-id='))) throw new Error('Unsupported CLI option.');
  if (command === 'apply') {
    if (!stagingArgument || dryRun || includeAst || includeConfig || includeMcpConfig || rollbackId) throw new Error('Apply requires only --staging and optional --confirm.');
    await applyStaged(folder, stagingArgument, confirm);
    return;
  }
  if (command === 'rollback') {
    if (!stagingArgument || dryRun || includeAst || includeConfig || includeMcpConfig) throw new Error('Rollback requires --staging and --rollback-id.');
    await rollbackStaged(folder, stagingArgument, rollbackId, confirm);
    return;
  }
  if (confirm || stagingArgument || rollbackId) throw new Error('Apply/rollback options are only available for apply or rollback.');
  if (includeMcpConfig && command !== 'analyze') throw new Error('The --mcp-config option is only available for analyze.');
  if (dryRun && command !== 'generate') throw new Error('The --dry-run option is only available for generate.');
  if (includeAst && command !== 'analyze') throw new Error('The --ast option is only available for analyze.');
  if (options.includes('--config') && command !== 'analyze' && !dryRun) throw new Error('The --config option is only available for analyze or generate dry-run.');
  if (securityProfile !== 'baseline' && securityProfile !== 'strict') throw new Error('Security profile must be baseline or strict');
  const abs = path.resolve(folder);
  if (!(await lstat(abs)).isDirectory()) throw new Error('Expected a directory');
  const input = await scan(abs, { includeAst, includeConfig, includeMcpConfig });
  const facts = analyzeProject(input);
  const blueprint = proposeBlueprint(facts, { target, workType: 'coding', needsReview: true, securityProfile });
  if (command === 'analyze') {
    const ast = includeAst ? await analyzeAstSources(input.astSources, { assets: astAssets }) : undefined;
    const existingConfig = includeConfig ? inspectExistingCodexConfig(input.configSources) : undefined;
    const mcpConfig = includeMcpConfig ? inspectMcpConfig(input.mcpSources) : undefined;
    console.log(JSON.stringify({ facts, blueprint, ...(ast ? { ast } : {}), ...(existingConfig ? { existingConfig } : {}), ...(mcpConfig ? { mcpConfig } : {}) }, null, 2));
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
        changes: findOutputChanges(input.paths, rendered.files),
        problems: validateArtifacts(rendered),
      },
      existingConfig: inspectExistingCodexConfig(input.configSources),
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
