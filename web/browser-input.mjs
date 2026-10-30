import { normalizeBrowserRelativePaths, safeRelativePath } from '../dist/core.js';

const manifestNames = new Set(['package.json', 'pyproject.toml', 'requirements.txt']);
const MAX_MANIFEST_BYTES = 100_000;
const AST_MAX_FILES = 100;
const AST_MAX_FILE_BYTES = 512_000;
const AST_MAX_TOTAL_BYTES = 5 * 1024 * 1024;

function isAstPath(path) {
  return /\.(?:py|tsx?)$/i.test(path);
}

/** Convert user-selected File API entries into the core's safe ProjectInput shape. */
export async function collectBrowserInput(fileEntries) {
  const entries = Array.from(fileEntries ?? []);
  const paths = [];
  const manifests = {};
  const normalizedPaths = normalizeBrowserRelativePaths(entries.map(file => file.webkitRelativePath || file.name || ''));
  for (const [index, file] of entries.entries()) {
    const relativePath = normalizedPaths[index];
    if (!relativePath) continue;
    paths.push(relativePath);
    const base = relativePath.includes('/') ? '' : relativePath;
    if (manifestNames.has(base) && Number.isFinite(file.size) && file.size <= MAX_MANIFEST_BYTES && typeof file.text === 'function') {
      manifests[base] = await file.text();
    }
  }
  return { paths, manifests };
}

/** Read bounded source text only when the browser caller explicitly opts into AST analysis. */
export async function collectBrowserAstSources(fileEntries) {
  const entries = Array.from(fileEntries ?? []);
  const normalizedPaths = normalizeBrowserRelativePaths(entries.map(file => file.webkitRelativePath || file.name || ''));
  const sources = [];
  const warnings = [];
  let totalBytes = 0;
  for (const [index, file] of entries.entries()) {
    if (sources.length >= AST_MAX_FILES) {
      warnings.push('AST file limit reached; additional files were ignored.');
      break;
    }
    const relativePath = normalizedPaths[index];
    const safePath = safeRelativePath(relativePath || '');
    if (!safePath || !isAstPath(safePath)) continue;
    if (!Number.isFinite(file.size) || file.size > AST_MAX_FILE_BYTES) {
      warnings.push('Skipped an AST source exceeding the file size limit.');
      continue;
    }
    if (totalBytes + file.size > AST_MAX_TOTAL_BYTES) {
      warnings.push('AST total source size limit reached; additional files were ignored.');
      break;
    }
    if (typeof file.text !== 'function') {
      warnings.push('Skipped an AST source without text access.');
      continue;
    }
    const content = await file.text();
    const actualBytes = new TextEncoder().encode(content).byteLength;
    if (actualBytes > AST_MAX_FILE_BYTES) {
      warnings.push('Skipped an AST source exceeding the file size limit.');
      continue;
    }
    if (totalBytes + actualBytes > AST_MAX_TOTAL_BYTES) {
      warnings.push('AST total source size limit reached; additional files were ignored.');
      break;
    }
    sources.push({ path: safePath, content });
    totalBytes += actualBytes;
  }
  return { sources, warnings: [...new Set(warnings)] };
}
