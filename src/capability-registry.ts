export const CAPABILITY_TARGETS = ['codex', 'claude-code', 'gemini-cli', 'antigravity', 'chatgpt'] as const;
export type CapabilityTarget = typeof CAPABILITY_TARGETS[number];

export const CAPABILITY_STATUSES = ['verified', 'partial', 'planned', 'unknown', 'unsupported', 'experimental'] as const;
export type CapabilityStatus = typeof CAPABILITY_STATUSES[number];

export const CAPABILITY_NAMES = ['instructions', 'skills', 'subagents', 'mcp'] as const;
export type CapabilityName = typeof CAPABILITY_NAMES[number];

export interface CapabilityEntry {
  target: CapabilityTarget;
  edition: string;
  version: string;
  checkedAt: string;
  status: CapabilityStatus;
  sourceUrls: string[];
  capabilities: Record<CapabilityName, CapabilityStatus>;
  fixtureIds: string[];
  notes?: string;
}

export interface CapabilityRegistry {
  schemaVersion: '0.1';
  checkedAt: string;
  entries: CapabilityEntry[];
}

export interface CapabilityUpdateCandidate {
  candidateVersion: '0.1';
  createdAt: string;
  registry: CapabilityRegistry;
}

export interface CapabilityChange {
  target: CapabilityTarget;
  changedFields: string[];
  previousStatus: CapabilityStatus;
  candidateStatus: CapabilityStatus;
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const officialHosts: Record<CapabilityTarget, Set<string>> = {
  codex: new Set(['learn.chatgpt.com', 'developers.openai.com', 'agentskills.io']),
  'claude-code': new Set(['code.claude.com', 'agentskills.io']),
  'gemini-cli': new Set(['geminicli.com', 'agentskills.io']),
  antigravity: new Set(['antigravity.google', 'agentskills.io']),
  chatgpt: new Set(['developers.openai.com', 'agentskills.io']),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHttpsUrl(value: unknown, target: CapabilityTarget): boolean {
  if (typeof value !== 'string') return false;
  if (!CAPABILITY_TARGETS.includes(target)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && !url.username
      && !url.password
      && officialHosts[target].has(url.hostname);
  } catch {
    return false;
  }
}

function equalArrays(left: unknown[], right: unknown[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** Validate reviewed registry data without reading files or contacting a network. */
export function validateCapabilityRegistry(value: unknown, knownFixtureIds?: ReadonlySet<string>): string[] {
  if (!isRecord(value)) return ['Capability registry must be an object.'];
  const problems: string[] = [];
  const keys = ['schemaVersion', 'checkedAt', 'entries'];
  for (const key of Object.keys(value)) if (!keys.includes(key)) problems.push(`Capability registry contains unknown field: ${key}.`);
  if (value.schemaVersion !== '0.1') problems.push('Capability registry schemaVersion must be 0.1.');
  if (typeof value.checkedAt !== 'string' || !datePattern.test(value.checkedAt)) problems.push('Capability registry checkedAt must be YYYY-MM-DD.');
  if (!Array.isArray(value.entries) || value.entries.length === 0) return [...problems, 'Capability registry entries must be a non-empty array.'];

  const seenTargets = new Set<string>();
  for (const [index, rawEntry] of value.entries.entries()) {
    const label = `Capability entry ${index}`;
    if (!isRecord(rawEntry)) {
      problems.push(`${label} must be an object.`);
      continue;
    }
    const entry = rawEntry;
    const entryKeys = ['target', 'edition', 'version', 'checkedAt', 'status', 'sourceUrls', 'capabilities', 'fixtureIds', 'notes'];
    for (const key of Object.keys(entry)) if (!entryKeys.includes(key)) problems.push(`${label} contains unknown field: ${key}.`);
    const target = entry.target as CapabilityTarget;
    if (!CAPABILITY_TARGETS.includes(target) || seenTargets.has(target)) problems.push(`${label} has an invalid or duplicate target.`);
    else seenTargets.add(target);
    if (typeof entry.edition !== 'string' || entry.edition.length === 0) problems.push(`${label} edition is required.`);
    if (typeof entry.version !== 'string' || entry.version.length === 0) problems.push(`${label} version is required.`);
    if (typeof entry.checkedAt !== 'string' || !datePattern.test(entry.checkedAt)) problems.push(`${label} checkedAt must be YYYY-MM-DD.`);
    if (!CAPABILITY_STATUSES.includes(entry.status as CapabilityStatus)) problems.push(`${label} status is invalid.`);
    if (!Array.isArray(entry.sourceUrls) || new Set(entry.sourceUrls).size !== entry.sourceUrls.length
      || entry.sourceUrls.length === 0 || entry.sourceUrls.some(url => !isHttpsUrl(url, target))) {
      problems.push(`${label} sourceUrls must be unique HTTPS URLs on an allowlisted official host.`);
    }
    const capabilities = isRecord(entry.capabilities) ? entry.capabilities : null;
    if (!capabilities || CAPABILITY_NAMES.some(name => !CAPABILITY_STATUSES.includes(capabilities[name] as CapabilityStatus))) {
      problems.push(`${label} capabilities are invalid.`);
    }
    if (!Array.isArray(entry.fixtureIds) || new Set(entry.fixtureIds).size !== entry.fixtureIds.length || entry.fixtureIds.length === 0) {
      problems.push(`${label} fixtureIds must be unique and non-empty.`);
    } else if (knownFixtureIds && entry.fixtureIds.some(fixture => !knownFixtureIds.has(fixture))) {
      problems.push(`${label} references a missing local fixture.`);
    }
    if (entry.notes !== undefined && typeof entry.notes !== 'string') problems.push(`${label} notes must be a string.`);
  }
  if (seenTargets.size !== CAPABILITY_TARGETS.length) problems.push('Capability registry must contain every declared target exactly once.');
  return problems;
}

export function validateCapabilityUpdateCandidate(value: unknown, knownFixtureIds?: ReadonlySet<string>): string[] {
  if (!isRecord(value)) return ['Capability update candidate must be an object.'];
  const problems: string[] = [];
  if (value.candidateVersion !== '0.1') problems.push('Capability update candidate candidateVersion must be 0.1.');
  if (typeof value.createdAt !== 'string' || !datePattern.test(value.createdAt)) problems.push('Capability update candidate createdAt must be YYYY-MM-DD.');
  problems.push(...validateCapabilityRegistry(value.registry, knownFixtureIds).map(problem => `Candidate registry: ${problem}`));
  return problems;
}

/** Compare registry metadata only; candidate notes and source text are never echoed. */
export function diffCapabilityRegistries(current: CapabilityRegistry, candidate: CapabilityRegistry): CapabilityChange[] {
  const currentByTarget = new Map(current.entries.map(entry => [entry.target, entry]));
  return candidate.entries.flatMap(entry => {
    const previous = currentByTarget.get(entry.target);
    if (!previous) return [{ target: entry.target, changedFields: ['added'], previousStatus: 'unknown' as CapabilityStatus, candidateStatus: entry.status }];
    const changedFields = ([
      'edition', 'version', 'checkedAt', 'status', 'sourceUrls', 'capabilities', 'fixtureIds', 'notes',
    ] as const).filter(field => {
      if (field === 'sourceUrls') return !equalArrays(previous.sourceUrls, entry.sourceUrls);
      if (field === 'fixtureIds') return !equalArrays(previous.fixtureIds, entry.fixtureIds);
      if (field === 'capabilities') return JSON.stringify(previous.capabilities) !== JSON.stringify(entry.capabilities);
      if (field === 'edition') return previous.edition !== entry.edition;
      if (field === 'version') return previous.version !== entry.version;
      if (field === 'checkedAt') return previous.checkedAt !== entry.checkedAt;
      if (field === 'status') return previous.status !== entry.status;
      return previous.notes !== entry.notes;
    }) as string[];
    return changedFields.length === 0 ? [] : [{
      target: entry.target,
      changedFields,
      previousStatus: previous.status,
      candidateStatus: entry.status,
    }];
  });
}
