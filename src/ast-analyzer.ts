import { Language, Node, Parser } from 'web-tree-sitter';
import { safeRelativePath } from './core.js';

export type AstLanguage = 'python' | 'typescript';

export interface AstSource {
  /** Safe relative path only; source contents never appear in the result. */
  path: string;
  content: string;
}

export interface AstParserAssets {
  /** Local path or browser URL to web-tree-sitter.wasm. */
  runtimeWasm: string;
  /** Local path or browser URL to grammar WASM files. */
  pythonWasm?: string;
  typescriptWasm?: string;
}

export interface AstAnalysisOptions {
  assets: AstParserAssets;
  maxFiles?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
}

export interface AstFileFinding {
  path: string;
  language: AstLanguage;
  syntax: 'ok' | 'error';
  declarationCount: number;
  importCount: number;
}

export interface AstAnalysis {
  files: AstFileFinding[];
  filesSeen: number;
  bytesSeen: number;
  warnings: string[];
}

const DEFAULT_LIMITS = Object.freeze({ maxFiles: 100, maxFileBytes: 512_000, maxTotalBytes: 5 * 1024 * 1024 });
const MAX_ALLOWED_LIMIT = Object.freeze({ maxFiles: 5_000, maxFileBytes: 5 * 1024 * 1024, maxTotalBytes: 25 * 1024 * 1024 });
const languageCache = new Map<string, Promise<Language>>();
let initializedRuntime: string | undefined;
let runtimeInitialization: Promise<void> | undefined;

function languageForPath(path: string): AstLanguage | null {
  if (/\.py$/i.test(path)) return 'python';
  if (/\.tsx?$/i.test(path)) return 'typescript';
  return null;
}

function boundedLimit(value: number | undefined, fallback: number, maximum: number): number {
  if (!Number.isInteger(value) || value === undefined || value < 1) return fallback;
  return Math.min(value, maximum);
}

function grammarPath(language: AstLanguage, assets: AstParserAssets): string | undefined {
  return language === 'python' ? assets.pythonWasm : assets.typescriptWasm;
}

function isRemoteAsset(path: string | undefined): boolean {
  return typeof path === 'string' && /^https?:\/\//i.test(path);
}

async function loadLanguage(language: AstLanguage, assets: AstParserAssets): Promise<Language | undefined> {
  const path = grammarPath(language, assets);
  if (!path) return undefined;
  if (isRemoteAsset(path)) throw new Error('Remote AST grammar assets are not allowed.');
  const cached = languageCache.get(path);
  if (cached) return cached;
  const loading = Language.load(path);
  languageCache.set(path, loading);
  return loading;
}

async function initializeRuntime(runtimeWasm: string): Promise<void> {
  if (initializedRuntime === runtimeWasm) return runtimeInitialization;
  if (runtimeInitialization && initializedRuntime !== runtimeWasm) {
    throw new Error('AST runtime already initialized with a different asset.');
  }
  initializedRuntime = runtimeWasm;
  runtimeInitialization = Parser.init({ locateFile: () => runtimeWasm });
  return runtimeInitialization;
}

function countNodes(root: Node, types: string[]): number {
  return root.descendantsOfType(types).length;
}

function analyzeTree(root: Node, language: AstLanguage): Pick<AstFileFinding, 'declarationCount' | 'importCount'> {
  const declarations = language === 'python'
    ? ['function_definition', 'class_definition']
    : ['class_declaration', 'function_declaration', 'interface_declaration', 'type_alias_declaration', 'enum_declaration'];
  const imports = language === 'python'
    ? ['import_statement', 'import_from_statement']
    : ['import_statement', 'import_require'];
  return { declarationCount: countNodes(root, declarations), importCount: countNodes(root, imports) };
}

/**
 * Analyze explicitly supplied source text with local Tree-sitter WASM assets.
 * This function returns only bounded structural facts and never returns source or AST nodes.
 */
export async function analyzeAstSources(sources: readonly AstSource[], options: AstAnalysisOptions): Promise<AstAnalysis> {
  const maxFiles = boundedLimit(options.maxFiles, DEFAULT_LIMITS.maxFiles, MAX_ALLOWED_LIMIT.maxFiles);
  const maxFileBytes = boundedLimit(options.maxFileBytes, DEFAULT_LIMITS.maxFileBytes, MAX_ALLOWED_LIMIT.maxFileBytes);
  const maxTotalBytes = boundedLimit(options.maxTotalBytes, DEFAULT_LIMITS.maxTotalBytes, MAX_ALLOWED_LIMIT.maxTotalBytes);
  const warnings: string[] = [];
  const files: AstFileFinding[] = [];
  let filesSeen = 0;
  let bytesSeen = 0;
  if (!options.assets?.runtimeWasm) return { files, filesSeen, bytesSeen, warnings: ['AST runtime asset is not configured.'] };
  if (isRemoteAsset(options.assets.runtimeWasm)) {
    return { files, filesSeen, bytesSeen, warnings: ['Remote AST runtime assets are not allowed.'] };
  }

  try { await initializeRuntime(options.assets.runtimeWasm); }
  catch { return { files, filesSeen, bytesSeen, warnings: ['AST runtime initialization failed.'] }; }

  for (const source of sources) {
    if (filesSeen >= maxFiles) { warnings.push('AST file limit reached; additional files were ignored.'); break; }
    filesSeen++;
    if (!source || typeof source !== 'object' || typeof source.path !== 'string' || typeof source.content !== 'string') {
      warnings.push('Skipped an AST source with invalid shape.');
      continue;
    }
    const safePath = safeRelativePath(source?.path ?? '');
    if (!safePath || safePath !== source.path) { warnings.push('Skipped an unsafe AST source path.'); continue; }
    const language = languageForPath(safePath);
    if (!language) { warnings.push('Skipped a source with an unsupported AST language.'); continue; }
    const bytes = new TextEncoder().encode(source.content).byteLength;
    if (bytes > maxFileBytes) { warnings.push('Skipped an AST source exceeding the file size limit.'); continue; }
    if (bytesSeen + bytes > maxTotalBytes) { warnings.push('AST total source size limit reached; additional files were ignored.'); break; }
    bytesSeen += bytes;
    let languageParser: Language | undefined;
    try { languageParser = await loadLanguage(language, options.assets); }
    catch { warnings.push('AST grammar loading failed.'); continue; }
    if (!languageParser) { warnings.push('AST grammar asset is not configured.'); continue; }
    const parser = new Parser();
    let tree;
    try {
      parser.setLanguage(languageParser);
      tree = parser.parse(source.content);
      if (!tree) { warnings.push('AST parser returned no tree.'); continue; }
      const counts = analyzeTree(tree.rootNode, language);
      files.push({ path: safePath, language, syntax: tree.rootNode.hasError ? 'error' : 'ok', ...counts });
    } catch { warnings.push('AST parsing failed for a bounded source.'); }
    finally { tree?.delete(); parser.delete(); }
  }
  return { files, filesSeen, bytesSeen, warnings: [...new Set(warnings)] };
}
