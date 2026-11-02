#!/usr/bin/env node
import { readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  diffCapabilityRegistries,
  validateCapabilityRegistry,
} from '../dist/capability-registry.js';
import { promoteRuntimeEvidence } from '../dist/runtime-evidence.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = path.join(root, 'data', 'capability-registry-0.1.json');
const snapshotsPath = path.join(root, 'capabilities');
const MAX_EVIDENCE_BYTES = 128 * 1024;
const option = (args, name) => args.find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readEvidence(filePath) {
  const metadata = await stat(filePath);
  if (metadata.size > MAX_EVIDENCE_BYTES) {
    throw new Error(`Runtime evidence exceeds the ${MAX_EVIDENCE_BYTES}-byte limit.`);
  }
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
  return new Set(await collectFiles(root));
}

function safeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.uaa-runtime-promotion-${process.pid}.tmp`;
  await writeFile(tempPath, safeJson(value), 'utf8');
  await rename(tempPath, filePath);
}

function rendererStatus(status) {
  return ['partial', 'verified', 'experimental'].includes(status) ? 'partial' : 'not_implemented';
}

async function activate(candidate, target) {
  const snapshotPath = path.join(snapshotsPath, `${target}.json`);
  const entry = candidate.entries.find(item => item.target === target);
  if (!entry) throw new Error(`Promoted target entry is missing: ${target}`);
  const registry = await readJson(registryPath);
  const snapshot = await readJson(snapshotPath);
  const originals = new Map([[registryPath, registry], [snapshotPath, snapshot]]);
  const files = [
    { path: registryPath, value: candidate },
    { path: snapshotPath, value: {
      ...snapshot,
      checked_at: entry.checkedAt,
      registry_version: candidate.schemaVersion,
      renderer_status: rendererStatus(entry.status),
    } },
  ];
  try {
    for (const file of files) await writeJsonAtomic(file.path, file.value);
  } catch (error) {
    for (const [filePath, value] of originals) await writeJsonAtomic(filePath, value).catch(() => {});
    throw error;
  }
}

const args = process.argv.slice(2);
const command = args[0] ?? 'help';
const evidenceFile = option(args, '--evidence') ?? args[1];
if (!['validate', 'diff', 'apply'].includes(command) || !evidenceFile) {
  console.log('Usage: node scripts/promote-runtime-evidence.mjs validate|diff|apply --evidence=<evidence.json> [--confirm]');
  process.exit(command === 'help' ? 0 : 2);
}
if (command === 'apply' && !args.includes('--confirm')) {
  throw new Error('Applying runtime evidence requires --confirm. Use diff first.');
}

const evidence = await readEvidence(path.resolve(evidenceFile));
const current = await readJson(registryPath);
const fixtureIds = await knownFixtureIds();
const currentProblems = validateCapabilityRegistry(current, fixtureIds);
if (currentProblems.length) throw new Error(`Active capability registry is invalid: ${currentProblems.join(' ')}`);

const promotion = promoteRuntimeEvidence(current, evidence);
if (promotion.problems.length || !promotion.candidate || !promotion.target) {
  console.error(JSON.stringify({ valid: false, problems: promotion.problems }, null, 2));
  process.exit(1);
}
const changes = diffCapabilityRegistries(current, promotion.candidate);

if (command === 'validate') {
  console.log(JSON.stringify({ mode: 'validation', valid: true, target: promotion.target, changes: changes.length }, null, 2));
  process.exit(0);
}

if (command === 'diff') {
  console.log(JSON.stringify({ mode: 'read-only-diff', valid: true, target: promotion.target, changes, activation: 'not-applied' }, null, 2));
  process.exit(0);
}

await activate(promotion.candidate, promotion.target);
console.log(JSON.stringify({ mode: 'activated', valid: true, target: promotion.target, changes, registryPath: 'data/capability-registry-0.1.json' }, null, 2));
