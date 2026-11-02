import type { Target } from './core.js';
import {
  validateCapabilityRegistry,
  type CapabilityEntry,
  type CapabilityRegistry,
} from './capability-registry.js';

export const RUNTIME_EVIDENCE_CAPABILITIES = [
  'instructions', 'skills', 'subagents', 'mcp', 'permissions',
] as const;
export type RuntimeEvidenceCapability = typeof RUNTIME_EVIDENCE_CAPABILITIES[number];
export type RuntimeEvidenceCapabilityStatus = 'not-tested' | 'format-verified' | 'runtime-verified' | 'failed';
export type RuntimeEvidenceOverallStatus = 'not-tested' | 'partial' | 'verified' | 'failed';
export type RuntimeEvidenceReviewStatus = 'unreviewed' | 'human-reviewed';

export interface RuntimeVerificationEvidence {
  schemaVersion: '0.1';
  target: Target;
  edition: string;
  version: string;
  verifiedAt: string;
  overallStatus: RuntimeEvidenceOverallStatus;
  reviewStatus: RuntimeEvidenceReviewStatus;
  capabilities: Record<RuntimeEvidenceCapability, RuntimeEvidenceCapabilityStatus>;
  evidenceIds: string[];
  limitations: string[];
}

export interface RuntimeEvidencePromotionResult {
  candidate?: CapabilityRegistry;
  target?: RuntimeVerificationEvidence['target'];
  problems: string[];
}

const TARGETS: Target[] = ['codex', 'claude-code', 'gemini-cli', 'antigravity', 'chatgpt'];
const CAPABILITY_STATUSES: RuntimeEvidenceCapabilityStatus[] = ['not-tested', 'format-verified', 'runtime-verified', 'failed'];
const OVERALL_STATUSES: RuntimeEvidenceOverallStatus[] = ['not-tested', 'partial', 'verified', 'failed'];
const REVIEW_STATUSES: RuntimeEvidenceReviewStatus[] = ['unreviewed', 'human-reviewed'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_LIMITATIONS = 10;
const MAX_LIMITATION_LENGTH = 500;
const MAX_EVIDENCE_IDS = 32;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= maxLength
    && !/[\u0000-\u001f\u007f]/.test(value);
}

function unknownKeys(value: Record<string, unknown>, allowed: string[], label: string): string[] {
  return Object.keys(value)
    .filter(key => !allowed.includes(key))
    .map(key => `${label} contains unknown field: ${key}.`);
}

/** Validate bounded, metadata-only runtime evidence without executing or reading references. */
export function validateRuntimeEvidence(value: unknown): string[] {
  if (!isRecord(value)) return ['Runtime evidence must be an object.'];
  const problems: string[] = [];
  problems.push(...unknownKeys(value, [
    'schemaVersion', 'target', 'edition', 'version', 'verifiedAt', 'overallStatus',
    'reviewStatus', 'capabilities', 'evidenceIds', 'limitations',
  ], 'Runtime evidence'));
  if (value.schemaVersion !== '0.1') problems.push('Runtime evidence schemaVersion must be 0.1.');
  if (!TARGETS.includes(value.target as Target)) problems.push('Runtime evidence target is invalid.');
  if (!isSafeText(value.edition, 100)) problems.push('Runtime evidence edition must be bounded text.');
  if (!isSafeText(value.version, 100)) problems.push('Runtime evidence version must be bounded text.');
  if (typeof value.verifiedAt !== 'string' || !DATE_PATTERN.test(value.verifiedAt)) {
    problems.push('Runtime evidence verifiedAt must be an ISO date.');
  }
  if (!OVERALL_STATUSES.includes(value.overallStatus as RuntimeEvidenceOverallStatus)) {
    problems.push('Runtime evidence overallStatus is invalid.');
  }
  if (!REVIEW_STATUSES.includes(value.reviewStatus as RuntimeEvidenceReviewStatus)) {
    problems.push('Runtime evidence reviewStatus is invalid.');
  }

  const capabilities = value.capabilities;
  if (!isRecord(capabilities)) {
    problems.push('Runtime evidence capabilities must be an object.');
  } else {
    problems.push(...unknownKeys(capabilities, [...RUNTIME_EVIDENCE_CAPABILITIES], 'Runtime evidence capabilities'));
    for (const capability of RUNTIME_EVIDENCE_CAPABILITIES) {
      if (!CAPABILITY_STATUSES.includes(capabilities[capability] as RuntimeEvidenceCapabilityStatus)) {
        problems.push(`Runtime evidence capability status is invalid: ${capability}.`);
      }
    }
    const statuses = RUNTIME_EVIDENCE_CAPABILITIES.map(capability => capabilities[capability]);
    const allRuntimeVerified = statuses.every(status => status === 'runtime-verified');
    const hasFailure = statuses.some(status => status === 'failed');
    if (value.overallStatus === 'verified' && (!allRuntimeVerified || value.reviewStatus !== 'human-reviewed')) {
      problems.push('Verified runtime evidence requires all capabilities to be runtime-verified and human-reviewed.');
    }
    if (value.overallStatus === 'failed' && !hasFailure) {
      problems.push('Failed runtime evidence must contain at least one failed capability.');
    }
  }

  if (!Array.isArray(value.evidenceIds) || value.evidenceIds.length === 0 || value.evidenceIds.length > MAX_EVIDENCE_IDS) {
    problems.push('Runtime evidence evidenceIds must contain 1 to 32 IDs.');
  } else {
    if (new Set(value.evidenceIds).size !== value.evidenceIds.length) problems.push('Runtime evidence evidenceIds must be unique.');
    if (value.evidenceIds.some(id => typeof id !== 'string' || !SAFE_ID_PATTERN.test(id))) problems.push('Runtime evidence evidenceIds must be safe IDs.');
  }
  if (!Array.isArray(value.limitations) || value.limitations.length > MAX_LIMITATIONS) {
    problems.push('Runtime evidence limitations must contain at most 10 items.');
  } else if (value.limitations.some(limitation => !isSafeText(limitation, MAX_LIMITATION_LENGTH))) {
    problems.push('Runtime evidence limitations must be bounded single-line text.');
  }
  return problems;
}

/**
 * Promote complete, reviewed runtime metadata into a registry candidate.
 * Evidence references are identifiers only; this function never reads or executes them.
 */
export function promoteRuntimeEvidence(
  registry: CapabilityRegistry,
  evidence: unknown,
): RuntimeEvidencePromotionResult {
  const problems = [
    ...validateCapabilityRegistry(registry),
    ...validateRuntimeEvidence(evidence),
  ];
  if (problems.length) return { problems };

  const verified = evidence as RuntimeVerificationEvidence;
  const allRuntimeVerified = RUNTIME_EVIDENCE_CAPABILITIES.every(
    capability => verified.capabilities[capability] === 'runtime-verified',
  );
  if (verified.overallStatus !== 'verified'
    || verified.reviewStatus !== 'human-reviewed'
    || !allRuntimeVerified) {
    return {
      target: verified.target,
      problems: ['Runtime evidence is not eligible for promotion: complete human-reviewed runtime verification is required.'],
    };
  }

  const currentEntry = registry.entries.find(entry => entry.target === verified.target);
  if (!currentEntry) {
    return { target: verified.target, problems: [`Capability registry has no entry for ${verified.target}.`] };
  }

  const promotedEntry: CapabilityEntry = {
    ...currentEntry,
    edition: verified.edition,
    version: verified.version,
    checkedAt: verified.verifiedAt,
    status: 'verified',
    capabilities: {
      ...currentEntry.capabilities,
      instructions: 'verified',
      skills: 'verified',
      subagents: 'verified',
      mcp: 'verified',
    },
    notes: [
      currentEntry.notes,
      `Runtime evidence reviewed: ${verified.evidenceIds.join(', ')}.`,
    ].filter(Boolean).join(' '),
  };
  const candidate: CapabilityRegistry = {
    ...registry,
    checkedAt: verified.verifiedAt,
    entries: registry.entries.map(entry => entry.target === verified.target ? promotedEntry : entry),
  };
  const candidateProblems = validateCapabilityRegistry(candidate);
  if (candidateProblems.length) return { target: verified.target, problems: candidateProblems };
  return { candidate, target: verified.target, problems: [] };
}
