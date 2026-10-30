import { findOutputChanges, GeneratedArtifact, OutputChange, safeRelativePath } from './core.js';

export interface ApplyPlan {
  changes: OutputChange[];
  artifacts: GeneratedArtifact[];
}

export type RollbackAction = 'restore' | 'remove';
export interface RollbackEntry {
  path: string;
  action: RollbackAction;
  backupPath?: string;
}

export interface RollbackRecord {
  version: '0.1';
  entries: RollbackEntry[];
}

/** Build a bounded, path-validated plan without reading or executing artifact instructions. */
export function createApplyPlan(existingPaths: readonly string[], artifacts: readonly GeneratedArtifact[]): ApplyPlan {
  const seen = new Set<string>();
  const safeArtifacts = artifacts.map(artifact => {
    if (!artifact || safeRelativePath(artifact.path) !== artifact.path || typeof artifact.content !== 'string') {
      throw new Error('Unsafe staged artifact.');
    }
    if (seen.has(artifact.path)) throw new Error(`Duplicate staged artifact: ${artifact.path}`);
    seen.add(artifact.path);
    return { path: artifact.path, content: artifact.content };
  });
  return { artifacts: safeArtifacts, changes: findOutputChanges([...existingPaths], safeArtifacts) };
}

export function createRollbackRecord(plan: ApplyPlan, backupPathFor: (path: string) => string | undefined): RollbackRecord {
  return {
    version: '0.1',
    entries: plan.changes.map(change => change.action === 'replace'
      ? { path: change.path, action: 'restore', backupPath: backupPathFor(change.path) }
      : { path: change.path, action: 'remove' }),
  };
}
