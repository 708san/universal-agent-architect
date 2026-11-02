#!/usr/bin/env node
import { lstat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createRuntimeEvidenceTemplate,
  RUNTIME_EVIDENCE_TARGETS,
  validateRuntimeEvidence,
} from '../dist/runtime-evidence.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generatedRoot = path.join(root, 'generated');
const option = (args, name) => args.find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);

function safeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function usage() {
  console.log('Usage: node scripts/create-runtime-evidence-template.mjs --target=codex --edition=CLI/IDE --version=unknown --date=YYYY-MM-DD [--evidence-id=id] [--output=generated/runtime-evidence/codex-0.1.json]');
}

function isWithin(parent, candidate) {
  return candidate === parent || candidate.startsWith(`${parent}${path.sep}`);
}

async function ensureSafeDirectory(directory) {
  const relative = path.relative(generatedRoot, directory);
  let current = generatedRoot;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    const currentStat = await lstat(current).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (currentStat && (!currentStat.isDirectory() || currentStat.isSymbolicLink())) {
      throw new Error(`Refusing unsafe generated parent: ${path.relative(root, current)}`);
    }
    if (!currentStat) await mkdir(current);
    current = path.join(current, segment);
  }
  const finalStat = await lstat(current).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (finalStat && (!finalStat.isDirectory() || finalStat.isSymbolicLink())) {
    throw new Error(`Refusing unsafe generated parent: ${path.relative(root, current)}`);
  }
  if (!finalStat) await mkdir(current);
}

const args = process.argv.slice(2);
if (args.includes('--help')) {
  usage();
  process.exit(0);
}
const target = option(args, '--target');
const edition = option(args, '--edition');
const version = option(args, '--version');
const verifiedAt = option(args, '--date');
const evidenceId = option(args, '--evidence-id');
const outputArgument = option(args, '--output');
if (!target || !edition || !version || !verifiedAt || !RUNTIME_EVIDENCE_TARGETS.includes(target)) {
  usage();
  throw new Error('Target, edition, version, date and a supported target are required.');
}

const template = createRuntimeEvidenceTemplate({ target, edition, version, verifiedAt, evidenceId });
const problems = validateRuntimeEvidence(template);
if (problems.length) throw new Error(`Invalid runtime evidence template: ${problems.join(' ')}`);

const outputPath = path.resolve(root, outputArgument ?? `generated/runtime-evidence/${target}-0.1.json`);
if (!isWithin(generatedRoot, outputPath) || outputPath === generatedRoot) {
  throw new Error('Template output must remain inside generated/.');
}
await ensureSafeDirectory(path.dirname(outputPath));
const existing = await lstat(outputPath).catch(error => {
  if (error.code === 'ENOENT') return null;
  throw error;
});
if (existing) throw new Error(`Refusing overwrite of existing template: ${path.relative(root, outputPath)}`);
await writeFile(outputPath, safeJson(template), { encoding: 'utf8', flag: 'wx' });
console.log(JSON.stringify({ mode: 'staged', path: path.relative(root, outputPath), status: template.overallStatus, target: template.target }, null, 2));
