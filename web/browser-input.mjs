import { normalizeBrowserRelativePaths } from '../dist/core.js';

const manifestNames = new Set(['package.json', 'pyproject.toml', 'requirements.txt']);
const MAX_MANIFEST_BYTES = 100_000;

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
