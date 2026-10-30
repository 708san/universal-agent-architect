import { safeRelativePath } from './core.js';

export type ExistingConfigKind = 'instruction' | 'skill' | 'codex-setting' | 'custom-agent';
export type ExistingConfigStatus = 'present' | 'valid' | 'malformed' | 'skipped';

export interface ExistingConfigSource {
  path: string;
  content?: string;
}

export interface ExistingConfigFinding {
  path: string;
  kind: ExistingConfigKind;
  status: ExistingConfigStatus;
}

export interface ExistingConfigReport {
  findings: ExistingConfigFinding[];
  warnings: string[];
}

const MAX_CONFIG_BYTES = 100_000;

function skillPath(path: string): boolean {
  return /(^|\/)(?:\.agents\/skills|skills)\/[^/]+\/SKILL\.md$/i.test(path);
}

function customAgentPath(path: string): boolean {
  return /^\.codex\/agents\/[^/]+\.toml$/i.test(path);
}

function configKind(path: string): ExistingConfigKind | null {
  if (/(^|\/)(?:AGENTS(?:\.override)?|CLAUDE|GEMINI)\.md$/i.test(path)) return 'instruction';
  if (skillPath(path)) return 'skill';
  if (path === '.codex/config.toml') return 'codex-setting';
  if (customAgentPath(path)) return 'custom-agent';
  return null;
}

function isValidSkill(path: string, content: string): boolean {
  const directory = path.split('/').at(-2);
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(content)?.[1] ?? '';
  const name = /^name:\s*([^\n]+)$/m.exec(frontmatter)?.[1]?.trim();
  const description = /^description:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim();
  return Boolean(directory && name === directory && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)
    && name.length <= 64 && description && description.length <= 1024);
}

function isValidCustomAgent(path: string, content: string): boolean {
  const filename = path.split('/').at(-1)?.replace(/\.toml$/i, '');
  const name = /^name\s*=\s*"([^"]+)"\s*$/m.exec(content)?.[1];
  const description = /^description\s*=\s*"([^"]*)"\s*$/m.exec(content)?.[1];
  const instructions = /^developer_instructions\s*=\s*(?:"[^"]*"|"""[\s\S]*?""")\s*$/m.exec(content);
  return Boolean(filename && name === filename && description && description.length > 0 && instructions);
}

/** Inspect recognized Codex files without returning their instructions or configuration values. */
export function inspectExistingCodexConfig(sources: readonly ExistingConfigSource[]): ExistingConfigReport {
  const findings: ExistingConfigFinding[] = [];
  const warnings: string[] = [];
  for (const source of sources) {
    if (!source || typeof source.path !== 'string') {
      warnings.push('Skipped an existing-config source with invalid shape.');
      continue;
    }
    const path = safeRelativePath(source.path);
    const kind = path ? configKind(path) : null;
    if (!path || !kind) {
      warnings.push('Skipped an unsafe or unsupported existing-config path.');
      continue;
    }
    if (typeof source.content !== 'string') {
      findings.push({ path, kind, status: 'skipped' });
      warnings.push('Skipped an existing-config file without readable content.');
      continue;
    }
    if (new TextEncoder().encode(source.content).byteLength > MAX_CONFIG_BYTES) {
      findings.push({ path, kind, status: 'skipped' });
      warnings.push('Skipped an existing-config file exceeding the size limit.');
      continue;
    }
    const status: ExistingConfigStatus = kind === 'instruction' || kind === 'codex-setting'
      ? 'present'
      : kind === 'skill'
        ? (isValidSkill(path, source.content) ? 'valid' : 'malformed')
        : (isValidCustomAgent(path, source.content) ? 'valid' : 'malformed');
    findings.push({ path, kind, status });
  }
  findings.sort((left, right) => left.path.localeCompare(right.path));
  return { findings, warnings: [...new Set(warnings)] };
}
