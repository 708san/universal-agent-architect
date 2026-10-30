import { safeRelativePath } from '../dist/core.js';

export const ZIP_LIMITS = Object.freeze({
  maxArchiveBytes: 25 * 1024 * 1024,
  maxEntryBytes: 5 * 1024 * 1024,
  maxTotalBytes: 20 * 1024 * 1024,
  maxEntries: 5_000,
});

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;

const crcTable = new Uint32Array(256);
for (let index = 0; index < crcTable.length; index++) {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
  crcTable[index] = value >>> 0;
}

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function fail(message) {
  throw new Error(`ZIP rejected: ${message}`);
}

function asBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  fail('expected byte data');
}

function readU16(view, offset, limit) {
  if (offset + 2 > limit) fail('truncated header');
  return view.getUint16(offset, true);
}

function readU32(view, offset, limit) {
  if (offset + 4 > limit) fail('truncated header');
  return view.getUint32(offset, true);
}

function writeU16(view, offset, value) { view.setUint16(offset, value, true); }
function writeU32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

function decodeName(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { fail('filename is not valid UTF-8'); }
}

function safeZipPath(name) {
  const safe = safeRelativePath(name);
  if (!safe || safe !== name || name.endsWith('/')) fail('unsafe or non-canonical filename');
  return safe;
}

function checkLimits(entryCount, entryBytes, totalBytes, archiveBytes) {
  if (entryCount > ZIP_LIMITS.maxEntries) fail('entry count limit exceeded');
  if (entryBytes > ZIP_LIMITS.maxEntryBytes) fail('entry size limit exceeded');
  if (totalBytes > ZIP_LIMITS.maxTotalBytes) fail('total size limit exceeded');
  if (archiveBytes > ZIP_LIMITS.maxArchiveBytes) fail('archive size limit exceeded');
}

/** Parse a local, store-only ZIP archive without filesystem, network or script access. */
export function parseStoredZip(input) {
  const bytes = asBytes(input);
  checkLimits(0, 0, 0, bytes.byteLength);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const searchStart = Math.max(0, bytes.byteLength - 65_557);
  let endOffset = -1;
  for (let offset = bytes.byteLength - 22; offset >= searchStart; offset--) {
    if (offset >= 0 && readU32(view, offset, bytes.byteLength) === END_SIGNATURE) { endOffset = offset; break; }
  }
  if (endOffset < 0) fail('end-of-directory record not found');
  const disk = readU16(view, endOffset + 4, bytes.byteLength);
  const centralDisk = readU16(view, endOffset + 6, bytes.byteLength);
  const entriesOnDisk = readU16(view, endOffset + 8, bytes.byteLength);
  const entryCount = readU16(view, endOffset + 10, bytes.byteLength);
  const centralSize = readU32(view, endOffset + 12, bytes.byteLength);
  const centralOffset = readU32(view, endOffset + 16, bytes.byteLength);
  const commentLength = readU16(view, endOffset + 20, bytes.byteLength);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount || endOffset + 22 + commentLength !== bytes.byteLength) {
    fail('multi-disk or malformed end-of-directory record');
  }
  if (entryCount > ZIP_LIMITS.maxEntries || centralOffset + centralSize > endOffset) fail('central directory is out of bounds');

  const entries = [];
  const seen = new Set();
  let cursor = centralOffset;
  let totalBytes = 0;
  for (let index = 0; index < entryCount; index++) {
    if (readU32(view, cursor, endOffset) !== CENTRAL_SIGNATURE) fail('invalid central directory entry');
    const flags = readU16(view, cursor + 8, endOffset);
    const method = readU16(view, cursor + 10, endOffset);
    const compressedSize = readU32(view, cursor + 20, endOffset);
    const uncompressedSize = readU32(view, cursor + 24, endOffset);
    const nameLength = readU16(view, cursor + 28, endOffset);
    const extraLength = readU16(view, cursor + 30, endOffset);
    const fileCommentLength = readU16(view, cursor + 32, endOffset);
    const entryDisk = readU16(view, cursor + 34, endOffset);
    const externalAttributes = readU32(view, cursor + 38, endOffset);
    const localOffset = readU32(view, cursor + 42, endOffset);
    if (flags !== 0 || method !== 0 || entryDisk !== 0 || compressedSize === 0xffffffff
      || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) fail('unsupported ZIP feature');
    if (((externalAttributes >>> 16) & 0xf000) === 0xa000) fail('symlink entry');
    const recordEnd = cursor + 46 + nameLength + extraLength + fileCommentLength;
    if (recordEnd > endOffset) fail('central directory entry is truncated');
    const name = safeZipPath(decodeName(bytes.slice(cursor + 46, cursor + 46 + nameLength)));
    if (seen.has(name)) fail('duplicate filename');
    seen.add(name);
    checkLimits(index + 1, uncompressedSize, totalBytes + uncompressedSize, bytes.byteLength);

    if (localOffset + 30 > centralOffset || readU32(view, localOffset, centralOffset) !== LOCAL_SIGNATURE) fail('invalid local file header');
    const localFlags = readU16(view, localOffset + 6, centralOffset);
    const localMethod = readU16(view, localOffset + 8, centralOffset);
    const localNameLength = readU16(view, localOffset + 26, centralOffset);
    const localExtraLength = readU16(view, localOffset + 28, centralOffset);
    const localDataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (localFlags !== flags || localMethod !== method || localDataStart + compressedSize > centralOffset) fail('local header mismatch');
    const localName = safeZipPath(decodeName(bytes.slice(localOffset + 30, localOffset + 30 + localNameLength)));
    if (localName !== name || compressedSize !== uncompressedSize) fail('filename or size mismatch');
    const data = bytes.slice(localDataStart, localDataStart + uncompressedSize);
    const expectedCrc = readU32(view, cursor + 16, endOffset);
    if (crc32(data) !== expectedCrc) fail('CRC mismatch');
    entries.push({ path: name, data });
    totalBytes += uncompressedSize;
    cursor = recordEnd;
  }
  if (cursor !== centralOffset + centralSize) fail('central directory size mismatch');
  return entries;
}

/** Create a deterministic, dependency-free store-only ZIP archive. */
export function createStoredZip(entries) {
  if (!Array.isArray(entries)) fail('entries must be an array');
  const normalized = [];
  const seen = new Set();
  let totalBytes = 0;
  for (const entry of entries) {
    if (!entry || typeof entry.path !== 'string') fail('entry path is invalid');
    const name = safeZipPath(entry.path);
    if (seen.has(name)) fail('duplicate filename');
    seen.add(name);
    const data = typeof entry.content === 'string' ? new TextEncoder().encode(entry.content) : asBytes(entry.content);
    checkLimits(normalized.length + 1, data.byteLength, totalBytes + data.byteLength, 0);
    normalized.push({ path: name, nameBytes: new TextEncoder().encode(name), data, crc: crc32(data) });
    totalBytes += data.byteLength;
  }
  const localBytes = normalized.reduce((sum, entry) => sum + 30 + entry.nameBytes.length + entry.data.length, 0);
  const centralBytes = normalized.reduce((sum, entry) => sum + 46 + entry.nameBytes.length, 0);
  const archiveBytes = localBytes + centralBytes + 22;
  checkLimits(normalized.length, 0, totalBytes, archiveBytes);
  const output = new Uint8Array(archiveBytes);
  const view = new DataView(output.buffer);
  const central = [];
  let offset = 0;
  for (const entry of normalized) {
    const localOffset = offset;
    writeU32(view, offset, LOCAL_SIGNATURE); writeU16(view, offset + 4, 10); writeU16(view, offset + 6, 0);
    writeU16(view, offset + 8, 0); writeU16(view, offset + 10, 0); writeU16(view, offset + 12, 0); writeU16(view, offset + 14, 0);
    writeU32(view, offset + 14, entry.crc); writeU32(view, offset + 18, entry.data.length); writeU32(view, offset + 22, entry.data.length);
    writeU16(view, offset + 26, entry.nameBytes.length); writeU16(view, offset + 28, 0);
    output.set(entry.nameBytes, offset + 30); output.set(entry.data, offset + 30 + entry.nameBytes.length);
    offset += 30 + entry.nameBytes.length + entry.data.length;
    central.push({ ...entry, localOffset });
  }
  const centralOffset = offset;
  for (const entry of central) {
    writeU32(view, offset, CENTRAL_SIGNATURE); writeU16(view, offset + 4, 0x0314); writeU16(view, offset + 6, 10);
    writeU16(view, offset + 8, 0); writeU16(view, offset + 10, 0); writeU16(view, offset + 12, 0); writeU16(view, offset + 14, 0);
    writeU32(view, offset + 16, entry.crc); writeU32(view, offset + 20, entry.data.length); writeU32(view, offset + 24, entry.data.length);
    writeU16(view, offset + 28, entry.nameBytes.length); writeU16(view, offset + 30, 0); writeU16(view, offset + 32, 0);
    writeU16(view, offset + 34, 0); writeU16(view, offset + 36, 0); writeU32(view, offset + 38, 0); writeU32(view, offset + 42, entry.localOffset);
    output.set(entry.nameBytes, offset + 46); offset += 46 + entry.nameBytes.length;
  }
  writeU32(view, offset, END_SIGNATURE); writeU16(view, offset + 4, 0); writeU16(view, offset + 6, 0);
  writeU16(view, offset + 8, normalized.length); writeU16(view, offset + 10, normalized.length);
  writeU32(view, offset + 12, centralBytes); writeU32(view, offset + 16, centralOffset); writeU16(view, offset + 20, 0);
  return output;
}
