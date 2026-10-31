import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('.');

test('browser UI follows the local, readable and bounded design baseline', async () => {
  const html = await readFile(path.join(root, 'web/index.html'), 'utf8');
  const styles = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';

  assert.match(html, /<html lang="ja">/);
  assert.match(html, /<main>/);
  assert.match(html, /<fieldset>/);
  assert.match(html, /<legend/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(styles, /font-family:\s*"BIZ UDPGothic".*"Noto Sans JP".*Meiryo.*system-ui/s);
  assert.match(styles, /font-size:\s*16px/);
  assert.match(styles, /line-height:\s*1\.6/);
  assert.match(styles, /:where\(button, input, select\):focus-visible/);

  for (const token of ['--ui-bg', '--ui-surface', '--ui-text', '--ui-muted', '--ui-border', '--ui-primary', '--ui-success', '--ui-warning', '--ui-danger']) {
    assert.match(styles, new RegExp(`${token}:`));
  }
  assert.doesNotMatch(styles, /@import\s|url\(\s*["']?https?:/i);
  assert.doesNotMatch(html, /(?:src|href)=\s*["']https?:/i);
  assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/i);
});
