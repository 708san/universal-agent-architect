import test from 'node:test';
import assert from 'node:assert/strict';
import { createStoredZip, parseStoredZip, ZIP_LIMITS } from '../web/browser-zip.mjs';

const encoder = new TextEncoder();

function replaceAllBytes(input, fromText, toText) {
  const output = new Uint8Array(input);
  const from = encoder.encode(fromText);
  const to = encoder.encode(toText);
  assert.equal(from.length, to.length);
  for (let index = 0; index <= output.length - from.length; index++) {
    if (from.every((byte, offset) => output[index + offset] === byte)) output.set(to, index);
  }
  return output;
}

test('store-only ZIP round trip is deterministic and preserves safe files', () => {
  const entries = [
    { path: 'AGENTS.md', content: '# Rules\n' },
    { path: 'src/app.ts', content: 'export const ok = true;\n' },
  ];
  const first = createStoredZip(entries);
  const second = createStoredZip(entries);
  assert.deepEqual(first, second);
  assert.deepEqual(parseStoredZip(first).map(entry => ({ path: entry.path, content: new TextDecoder().decode(entry.data) })), entries);
});

test('ZIP parser rejects traversal, duplicate, symlink, compression and CRC attacks', () => {
  assert.throws(() => parseStoredZip(replaceAllBytes(createStoredZip([{ path: 'safe', content: 'x' }]), 'safe', '../x')), /unsafe/);
  assert.throws(() => parseStoredZip(replaceAllBytes(createStoredZip([{ path: 'a', content: 'x' }, { path: 'b', content: 'y' }]), 'b', 'a')), /duplicate/);

  const symlink = createStoredZip([{ path: 'link', content: 'x' }]);
  const symlinkView = new DataView(symlink.buffer);
  const centralSignature = 0x02014b50;
  for (let offset = 0; offset + 4 <= symlink.length; offset++) {
    if (symlinkView.getUint32(offset, true) === centralSignature) symlinkView.setUint32(offset + 38, 0xa0000000, true);
  }
  assert.throws(() => parseStoredZip(symlink), /symlink/);

  const compressed = createStoredZip([{ path: 'file', content: 'x' }]);
  const compressedView = new DataView(compressed.buffer);
  for (let offset = 0; offset + 12 <= compressed.length; offset++) {
    if (compressedView.getUint32(offset, true) === 0x04034b50) compressedView.setUint16(offset + 8, 8, true);
    if (compressedView.getUint32(offset, true) === centralSignature) compressedView.setUint16(offset + 10, 8, true);
  }
  assert.throws(() => parseStoredZip(compressed), /unsupported/);

  const badCrc = createStoredZip([{ path: 'file', content: 'x' }]);
  const badCrcView = new DataView(badCrc.buffer);
  const badCrcDataStart = 30 + badCrcView.getUint16(26, true) + badCrcView.getUint16(28, true);
  badCrc[badCrcDataStart] ^= 0xff;
  assert.throws(() => parseStoredZip(badCrc), /CRC|central|header/);
});

test('ZIP limits reject oversized archives and unsafe output names', () => {
  assert.throws(() => parseStoredZip(new Uint8Array(ZIP_LIMITS.maxArchiveBytes + 1)), /archive size/);
  assert.throws(() => createStoredZip([{ path: '../escape', content: 'x' }]), /unsafe/);
  assert.throws(() => createStoredZip([{ path: 'a', content: 'x' }, { path: 'a', content: 'y' }]), /duplicate/);
  assert.throws(() => createStoredZip([{ path: '.env', content: 'secret' }]), /unsafe/);
});
