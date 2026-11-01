#!/usr/bin/env node
import { readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  diffCapabilityRegistries,
  validateCapabilityRegistry,
  validateCapabilityUpdateCandidate,
} from '../dist/capability-registry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = path.join(root, 'data', 'capability-registry-0.1.json');
const snapshotsPath = path.join(root, 'capabilities');
const option = (args, name) => args.find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function collectFiles(directory, relative = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const relativePath = relative ? `${relative}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(absolutePath, relativePath));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

async function knownFixtureIds() {
  const files = await collectFiles(root);
  return new Set(files);
}

function safeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.uaa-refresh-${process.pid}.tmp`;
  await writeFile(tempPath, safeJson(value), 'utf8');
  await rename(tempPath, filePath);
}

function rendererStatus(status) {
  return ['partial', 'verified', 'experimental'].includes(status) ? 'partial' : 'not_implemented';
}

async function activate(candidate) {
  const files = [{ path: registryPath, value: candidate.registry }];
  const originals = new Map([[registryPath, await readJson(registryPath)]]);
  for (const entry of candidate.registry.entries) {
    const snapshotPath = path.join(snapshotsPath, `${entry.target}.json`);
    const snapshot = await readJson(snapshotPath);
    originals.set(snapshotPath, snapshot);
    files.push({ path: snapshotPath, value: {
      ...snapshot,
      checked_at: entry.checkedAt,
      registry_version: candidate.registry.schemaVersion,
      renderer_status: rendererStatus(entry.status),
    } });
  }
  try {
    for (const file of files) await writeJsonAtomic(file.path, file.value);
  } catch (error) {
    for (const [filePath, value] of originals) await writeJsonAtomic(filePath, value).catch(() => {});
    throw error;
  }
}

const args = process.argv.slice(2);
const command = args[0] ?? 'help';
const candidateFile = option(args, '--candidate') ?? args[1];
if (!['validate', 'diff', 'apply'].includes(command) || !candidateFile) {
  console.log('Usage: node scripts/spec-refresh.mjs validate|diff|apply --candidate=<candidate.json> [--confirm]');
  process.exit(command === 'help' ? 0 : 2);
}
if (command === 'apply' && !args.includes('--confirm')) {
  throw new Error('Applying a capability candidate requires --confirm. Use diff first.');
}

const candidate = await readJson(path.resolve(candidateFile));
const fixtureIds = await knownFixtureIds();
const candidateProblems = validateCapabilityUpdateCandidate(candidate, fixtureIds);
if (candidateProblems.length) {
  console.error(JSON.stringify({ valid: false, problems: candidateProblems }, null, 2));
  process.exit(1);
}

const current = await readJson(registryPath);
const currentProblems = validateCapabilityRegistry(current, fixtureIds);
if (currentProblems.length) throw new Error(`Active capability registry is invalid: ${currentProblems.join(' ')}`);
const changes = diffCapabilityRegistries(current, candidate.registry);

if (command === 'validate') {
  console.log(JSON.stringify({ valid: true, changes: changes.length }, null, 2));
  process.exit(0);
}

if (command === 'diff') {
  console.log(JSON.stringify({ mode: 'read-only-diff', valid: true, changes, activation: 'not-applied' }, null, 2));
  process.exit(0);
}

await activate(candidate);
console.log(JSON.stringify({ mode: 'activated', valid: true, changes, registryPath: 'data/capability-registry-0.1.json' }, null, 2));
