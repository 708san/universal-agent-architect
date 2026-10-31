import { analyzeProject, proposeBlueprint, generateArtifacts, validateArtifacts } from '../dist/core.js';
import { analyzeAstSources } from '../dist/ast-analyzer.js';
import { collectBrowserInput, collectBrowserAstSources } from './browser-input.mjs';
import { parseStoredZip, createStoredZip } from './browser-zip.mjs';

const $ = id => document.getElementById(id);
let lastArtifacts = [];

function setStatus(message, state = 'idle') {
  const status = $('status');
  status.textContent = message;
  status.dataset.state = state;
}

for (const id of ['files', 'files-fallback', 'zip']) {
  $(id).addEventListener('change', () => {
    const selected = [
      ['files', 'プロジェクトフォルダ'],
      ['files-fallback', '個別ファイル'],
      ['zip', 'ZIP'],
    ].filter(([inputId]) => $(inputId).files.length > 0).map(([, label]) => label);
    setStatus(selected.length === 1 ? `${selected[0]}を選択しました。解析を開始できます。` : selected.length > 1 ? '複数の入力が選択されています。1つだけ選択してください。' : '解析対象を選択してください。', selected.length > 1 ? 'error' : 'idle');
  });
}

$('run').addEventListener('click', async () => {
  $('run').disabled = true;
  $('export').disabled = true;
  setStatus('解析中です。選択したファイルをブラウザ内で処理しています。', 'progress');
  try {
    const folderEntries = [...$('files').files];
    const fallbackEntries = [...$('files-fallback').files];
    const zipFile = $('zip').files[0];
    const sourceCount = Number(folderEntries.length > 0) + Number(fallbackEntries.length > 0) + Number(Boolean(zipFile));
    if (sourceCount > 1) { $('output').textContent = 'フォルダ、個別ファイル、ZIPのいずれか一つだけを選択してください。'; setStatus('入力が複数選択されています。1つだけ選択してください。', 'error'); return; }
    if (sourceCount === 0) { $('output').textContent = 'フォルダ、個別ファイルまたはZIPを選択してください。'; setStatus('解析対象を選択してください。', 'error'); return; }
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
    setStatus(rendered.supported ? '解析と提案が完了しました。生成物を確認してZIP保存できます。' : '解析は完了しましたが、この出力先は未対応です。', rendered.supported ? 'success' : 'error');
  } catch (error) {
    lastArtifacts = [];
    $('export').disabled = true;
    $('output').textContent = error instanceof Error ? error.message : '入力を処理できませんでした。';
    setStatus('解析に失敗しました。表示された内容を確認してください。', 'error');
  } finally {
    $('run').disabled = false;
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
  setStatus('生成物をZIPとして保存しました。', 'success');
});
