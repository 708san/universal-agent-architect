import { safeRelativePath } from './core.js';

export type McpConfigFormat = 'json' | 'codex-toml';
export type McpTransport = 'stdio' | 'http' | 'sse' | 'unknown';
export type McpConfigStatus = 'valid' | 'malformed' | 'unsupported' | 'skipped';

export interface McpConfigSource {
  path: string;
  content?: string;
}

export interface McpServerFinding {
  configPath: string;
  format: McpConfigFormat;
  name?: string;
  transport: McpTransport;
  status: McpConfigStatus;
  hasCredentialLikeFields: boolean;
}

export interface McpConfigReport {
  findings: McpServerFinding[];
  warnings: string[];
}

const MAX_CONFIG_BYTES = 100_000;
const credentialPattern = /(?:token|secret|password|credential|api[_-]?key|authorization|auth)/i;

function configFormat(path: string): McpConfigFormat | null {
  if (path === '.mcp.json' || path === '.gemini/settings.json') return 'json';
  if (path === '.codex/config.toml') return 'codex-toml';
  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function transportForServer(server: Record<string, unknown>): McpTransport {
  if (typeof server.command === 'string') return 'stdio';
  if (typeof server.httpUrl === 'string') return 'http';
  if (typeof server.url === 'string') return server.type === 'http' ? 'http' : server.type === 'sse' ? 'sse' : 'unknown';
  return 'unknown';
}

function hasCredentialLikeFields(server: Record<string, unknown>): boolean {
  return Object.keys(server).some(key => key === 'env' || key === 'headers' || credentialPattern.test(key));
}

function parseJsonSource(path: string, content: string): McpServerFinding[] {
  let root: unknown;
  try { root = JSON.parse(content); } catch { return [{ configPath: path, format: 'json', transport: 'unknown', status: 'malformed', hasCredentialLikeFields: false }]; }
  if (!isObject(root) || !isObject(root.mcpServers)) {
    return [{ configPath: path, format: 'json', transport: 'unknown', status: 'malformed', hasCredentialLikeFields: false }];
  }
  const findings: McpServerFinding[] = [];
  for (const [name, value] of Object.entries(root.mcpServers)) {
    if (!name.trim() || !isObject(value)) {
      findings.push({ configPath: path, format: 'json', name: name || undefined, transport: 'unknown', status: 'malformed', hasCredentialLikeFields: false });
      continue;
    }
    const transport = transportForServer(value);
    findings.push({ configPath: path, format: 'json', name, transport, status: transport === 'unknown' ? 'unsupported' : 'valid', hasCredentialLikeFields: hasCredentialLikeFields(value) });
  }
  if (!findings.length) findings.push({ configPath: path, format: 'json', transport: 'unknown', status: 'unsupported', hasCredentialLikeFields: false });
  return findings;
}

function parseCodexToml(path: string, content: string): McpServerFinding[] {
  const lines = content.split(/\r?\n/);
  const findings: McpServerFinding[] = [];
  let current: { name: string; keys: Set<string> } | undefined;
  const flush = () => {
    if (!current) return;
    const transport = current.keys.has('command') ? 'stdio' : current.keys.has('http_url') ? 'http' : current.keys.has('url') ? 'unknown' : 'unknown';
    findings.push({ configPath: path, format: 'codex-toml', name: current.name, transport, status: transport === 'unknown' ? 'unsupported' : 'valid', hasCredentialLikeFields: [...current.keys].some(key => key === 'env' || key === 'headers' || credentialPattern.test(key)) });
  };
  for (const line of lines) {
    const table = /^\[mcp_servers\.(?:"([^"]+)"|([A-Za-z0-9_-]+))\]\s*$/.exec(line.trim());
    if (table) { flush(); current = { name: table[1] ?? table[2] ?? '', keys: new Set() }; continue; }
    if (/^\[mcp_servers\./.test(line.trim()) && !current) {
      findings.push({ configPath: path, format: 'codex-toml', transport: 'unknown', status: 'malformed', hasCredentialLikeFields: false });
      continue;
    }
    const key = /^([A-Za-z0-9_-]+)\s*=/.exec(line.trim())?.[1];
    if (current && key) current.keys.add(key);
  }
  flush();
  if (!findings.length) findings.push({ configPath: path, format: 'codex-toml', transport: 'unknown', status: 'unsupported', hasCredentialLikeFields: false });
  return findings;
}

/** Discover MCP declarations structurally; never resolves values or starts a server. */
export function inspectMcpConfig(sources: readonly McpConfigSource[]): McpConfigReport {
  const findings: McpServerFinding[] = [];
  const warnings: string[] = [];
  for (const source of sources) {
    if (!source || typeof source.path !== 'string') { warnings.push('Skipped an MCP config source with invalid shape.'); continue; }
    const safePath = safeRelativePath(source.path);
    const format = safePath ? configFormat(safePath) : null;
    if (!safePath || !format) { warnings.push('Skipped an unsafe or unsupported MCP config path.'); continue; }
    if (typeof source.content !== 'string') { findings.push({ configPath: safePath, format, transport: 'unknown', status: 'skipped', hasCredentialLikeFields: false }); continue; }
    if (new TextEncoder().encode(source.content).byteLength > MAX_CONFIG_BYTES) {
      findings.push({ configPath: safePath, format, transport: 'unknown', status: 'skipped', hasCredentialLikeFields: false });
      warnings.push('Skipped an MCP config exceeding the size limit.');
      continue;
    }
    findings.push(...(format === 'json' ? parseJsonSource(safePath, source.content) : parseCodexToml(safePath, source.content)));
  }
  findings.sort((left, right) => `${left.configPath}:${left.name ?? ''}`.localeCompare(`${right.configPath}:${right.name ?? ''}`));
  return { findings, warnings: [...new Set(warnings)] };
}
