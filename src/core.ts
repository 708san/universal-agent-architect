/** Universal Agent Architect: pure, offline-first, dependency-free core (prototype). */
export type Target = 'codex' | 'claude-code' | 'gemini-cli' | 'antigravity' | 'chatgpt';
export type WorkType = 'coding';
export interface ProjectFacts {
  filesSeen: number;
  languages: string[];
  frameworks: string[];
  hasTests: boolean;
  hasGitHubActions: boolean;
  hasExistingAgentInstructions: boolean;
  hasExistingSkills: boolean;
  warnings: string[];
}
export interface ProjectInput {
  /** Paths only: do not include private file contents. */
  paths: string[];
  /** Only allowlisted manifest contents; never pass secrets or source by default. */
  manifests?: Record<string, string>;
}
export interface DesignRequest {
  target: Target;
  workType: WorkType;
  needsReview?: boolean;
  independentWorkstreams?: number;
}
export interface Blueprint {
  schemaVersion: '0.1';
  target: Target;
  workType: WorkType;
  agents: { id: string; role: string }[];
  skills: { id: string; purpose: string }[];
  reasons: string[];
  warnings: string[];
  security: { network: 'deny'; fileWrites: 'approval'; runGeneratedScripts: false };
}
export interface GeneratedArtifact { path: string; content: string }
export interface GenerateResult { supported: boolean; reason?: string; files: GeneratedArtifact[] }

const forbiddenParts = new Set([
  '.git', '.env', '.ssh', '.aws', '.npmrc', 'node_modules', 'vendor', 'dist', 'build',
  '.next', 'coverage', '.venv', 'venv', '__pycache__', 'secrets', 'private',
]);
const allowedManifests = new Set(['package.json', 'pyproject.toml', 'requirements.txt']);
const MAX_MANIFEST_BYTES = 100_000;

/** Refuse absolute / traversal / sensitive paths before counting or reading. */
export function safeRelativePath(raw: string): string | null {
  if (!raw || raw.includes('\0') || raw.includes('\\')) return null;
  const path = raw.replace(/^\.\//, '');
  if (path.startsWith('/') || /^[a-zA-Z]:/.test(path)) return null;
  const parts = path.split('/');
  if (parts.some(p => !p || p === '.' || p === '..' || forbiddenParts.has(p.toLowerCase()) || p.toLowerCase().startsWith('.env'))) return null;
  if (parts.some(p => /\.(pem|key|p12|pfx)$/i.test(p))) return null;
  return path;
}

function getManifest(input: ProjectInput, name: string): string {
  const value = input.manifests?.[name];
  if (!allowedManifests.has(name) || typeof value !== 'string') return '';
  if (new TextEncoder().encode(value).length > MAX_MANIFEST_BYTES) return '';
  return value;
}

/** Build a minimal facts object without preserving source file contents. */
export function analyzeProject(input: ProjectInput): ProjectFacts {
  const paths = input.paths.filter(p => safeRelativePath(p) !== null).map(p => p.replace(/^\.\//, ''));
  const unique = [...new Set(paths)];
  const languages = new Set<string>();
  for (const p of unique) {
    if (/\.py$/i.test(p)) languages.add('python');
    if (/\.tsx?$/i.test(p)) languages.add('typescript');
    if (/\.jsx?$/i.test(p)) languages.add('javascript');
    if (/\.ipynb$/i.test(p)) languages.add('notebook');
  }
  const frameworks = new Set<string>();
  const pkg = getManifest(input, 'package.json');
  if (pkg) {
    try {
      const json = JSON.parse(pkg) as Record<string, unknown>;
      const deps = { ...(typeof json.dependencies === 'object' && json.dependencies ? json.dependencies : {}),
        ...(typeof json.devDependencies === 'object' && json.devDependencies ? json.devDependencies : {}) };
      for (const name of ['react','next','vite','vitest','jest','express']) if (Object.hasOwn(deps, name)) frameworks.add(name);
    } catch { /* Invalid manifest: no contents leave this process. */ }
  }
  const py = `${getManifest(input, 'requirements.txt')}\n${getManifest(input, 'pyproject.toml')}`;
  for (const name of ['fastapi','pytest','django','flask']) {
    if (new RegExp(`(^|[^a-z])${name}([^a-z]|$)`, 'im').test(py)) frameworks.add(name);
  }
  const names = new Set(unique);
  const hasTests = unique.some(p => /(^|\/)(tests?|__tests__)(\/|$)/i.test(p) || /(^|\/)(pytest\.ini|vitest\.config\.[jt]s)$/i.test(p));
  const hasExistingSkills = unique.some(p => /(^|\/)skills\/[^/]+\/SKILL\.md$/.test(p));
  return {
    filesSeen: unique.length,
    languages: [...languages].sort(),
    frameworks: [...frameworks].sort(),
    hasTests,
    hasGitHubActions: unique.some(p => p.startsWith('.github/workflows/')),
    hasExistingAgentInstructions: names.has('AGENTS.md') || names.has('CLAUDE.md') || names.has('GEMINI.md'),
    hasExistingSkills,
    warnings: [
      'Static structural analysis only; no source code execution or semantic correctness claims.',
      'Path inventory may reveal filenames: review before sharing this report with cloud AI.',
    ],
  };
}

/** Deterministic architecture proposal. No model calls, filesystem access, or network. */
export function proposeBlueprint(facts: ProjectFacts, req: DesignRequest): Blueprint {
  const skills: Blueprint['skills'] = [];
  const reasons = ['Use one main agent by default: additional agents increase cost and coordination complexity.'];
  if (req.needsReview) {
    skills.push({ id: 'code-review', purpose: 'Review changes for correctness, regressions and security.' });
    reasons.push('Review requested: add a reusable review skill.');
  }
  if (facts.hasTests) {
    skills.push({ id: 'test-verification', purpose: 'Run existing tests and report evidence.' });
    reasons.push('Reuse existing test infrastructure rather than inventing new commands.');
  } else {
    reasons.push('No tests detected: document testing gaps before adding test-runner instructions.');
  }
  const agents: Blueprint['agents'] = [{ id: 'main', role: 'implementation' }];
  if ((req.independentWorkstreams ?? 1) >= 2) {
    agents.push({ id: 'reviewer', role: 'independent-read-only-review' });
    reasons.push('Multiple independent workstreams: optionally delegate read-only review to a separate agent.');
  }
  const warnings = [...facts.warnings];
  if (facts.hasExistingAgentInstructions || facts.hasExistingSkills) warnings.push('Existing instructions or skills detected: compare before applying.');
  if (req.target !== 'codex') warnings.push(`Rendering for ${req.target} is planned, not implemented in the prototype.`);
  return { schemaVersion: '0.1', target: req.target, workType: req.workType, agents, skills,
    reasons, warnings, security: { network: 'deny', fileWrites: 'approval', runGeneratedScripts: false } };
}

function skillMarkdown(id: string, purpose: string): string {
  const instruction = id === 'code-review'
    ? 'Review only the requested diff. Prioritize concrete correctness, regression, and security risks. Cite paths/lines. Do not modify files or send project data externally.'
    : 'Identify the project\'s existing test commands from local configuration, ask before running untrusted scripts, run only authorized tests, and report pass/fail evidence.';
  return `---\nname: ${id}\ndescription: ${purpose} Use when the user explicitly requests this workflow.\n---\n\n# ${id}\n\n${instruction}\n`;
}

/** Render only verified Codex files; other targets must not silently receive fake output. */
export function generateArtifacts(blueprint: Blueprint): GenerateResult {
  if (blueprint.target !== 'codex') return { supported: false, reason: `${blueprint.target} adapter not yet implemented`, files: [] };
  const skills = blueprint.skills.map(s => ({ path: `.agents/skills/${s.id}/SKILL.md`, content: skillMarkdown(s.id, s.purpose) }));
  const agents = blueprint.agents.length > 1 ? [{ path: '.codex/agents/reviewer.toml', content: 'name = "reviewer"\ndescription = "Read-only independent review of changed files."\ndeveloper_instructions = "Review for correctness and security. Never edit files. Never send private content to third parties."\n' }] : [];
  return { supported: true, files: [
    { path: 'AGENTS.md', content: '# Project instructions\n\n- Work within the approved project directory.\n- Do not send source or personal data to external services without explicit permission.\n- Before edits, inspect existing instructions and present a diff.\n- Run only authorized tests; report verification honestly.\n' },
    ...skills, ...agents,
  ] };
}

export function validateArtifacts(result: GenerateResult): string[] {
  if (!result.supported) return [result.reason ?? 'Unsupported target'];
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const f of result.files) {
    if (safeRelativePath(f.path) === null) problems.push(`Unsafe output path: ${f.path}`);
    if (seen.has(f.path)) problems.push(`Duplicate output path: ${f.path}`);
    seen.add(f.path);
    if (f.path.endsWith('/SKILL.md')) {
      const match = /^---\nname: ([a-z0-9]+(?:-[a-z0-9]+)*)\ndescription: ([^\n]+)\n---\n/.exec(f.content);
      if (!match || match[1] !== f.path.split('/').at(-2) || (match[2]?.length ?? 0) > 1024) problems.push(`Invalid skill: ${f.path}`);
    }
  }
  return problems;
}
