import { readFile } from 'node:fs/promises';
import { validateRuntimeEvidence } from '../dist/runtime-evidence.js';

const evidence = JSON.parse(await readFile('tests/fixtures/runtime-evidence-codex-0.1.json', 'utf8'));
const problems = validateRuntimeEvidence(evidence);
if (problems.length) throw new Error(problems.join(' '));
console.log(`Runtime evidence: OK (${evidence.target}; ${evidence.overallStatus}; metadata-only)`);
