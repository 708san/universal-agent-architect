import { analyzeProject, proposeBlueprint, generateArtifacts, validateArtifacts } from '../dist/core.js';
import { analyzeAstSources } from '../dist/ast-analyzer.js';
import { collectBrowserInput, collectBrowserAstSources } from './browser-input.mjs';
import { parseStoredZip, createStoredZip } from './browser-zip.mjs';

const $ = id => document.getElementById(id);
let lastArtifacts = [];

$('run').addEventListener('click', async () => {
  try {
    const folderEntries = [...$('files').files];
    const fallbackEntries = [...$('files-fallback').files];
    const zipFile = $('zip').files[0];
    const sourceCount = Number(folderEntries.length > 0) + Number(fallbackEntries.length > 0) + Number(Boolean(zipFile));
    if (sourceCount > 1) { $('output').textContent = 'フォルダ、個別ファイル、ZIPのいずれか一つだけを選択してください。'; return; }
    if (sourceCount === 0) { $('output').textContent = 'フォルダ、個別ファイルまたはZIPを選択してください。'; return; }
    const entries = folderEntries.length ? folderEntries : fallbackEntries.length ? fallbackEntries : parseStoredZip(await zipFile.arrayBuffer()).map(entry => ({
      webkitRelativePath: entry.path,
      name: entry.path.split('/').at(-1),
      size: entry.data.byteLength,
      text: async () => new TextDecoder().decode(entry.data),
    }));
    const input = await collectBrowserInput(entries);
    const astSelection = $('ast').checked ? await collectBrowserAstSources(entries) : null;
    const facts = analyzeProject(input);
    const blueprint = proposeBlueprint(facts, { target: $('target').value, workType: 'coding', needsReview: $('review').checked, securityProfile: $('security').value });
    const rendered = generateArtifacts(blueprint);
    lastArtifacts = rendered.supported ? rendered.files : [];
    $('export').disabled = !lastArtifacts.length;
    const ast = astSelection ? await analyzeAstSources(astSelection.sources, { assets: {
      runtimeWasm: new URL('./vendor/web-tree-sitter.wasm', import.meta.url).href,
      pythonWasm: new URL('./vendor/tree-sitter-python.wasm', import.meta.url).href,
      typescriptWasm: new URL('./vendor/tree-sitter-typescript.wasm', import.meta.url).href,
    } }) : undefined;
    if (ast && astSelection.warnings.length) ast.warnings = [...new Set([...astSelection.warnings, ...ast.warnings])];
    $('output').textContent = JSON.stringify({ facts, blueprint, ...(ast ? { ast } : {}), rendering: {
      supported: rendered.supported,
      generatedFiles: rendered.files.map(file => file.path),
      problems: validateArtifacts(rendered),
    } }, null, 2);
  } catch (error) {
    lastArtifacts = [];
    $('export').disabled = true;
    $('output').textContent = error instanceof Error ? error.message : '入力を処理できませんでした。';
  }
});

$('export').addEventListener('click', () => {
  if (!lastArtifacts.length) return;
  const blob = new Blob([createStoredZip(lastArtifacts.map(file => ({ path: file.path, content: file.content })))], { type: 'application/zip' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'uaa-generated.zip';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
});
