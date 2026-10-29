import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url), buffer = readFileSync(new URL('public/downloads/blog-neighbor-care-extension-latest.zip', root));
let end = -1;
for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break; }
assert.notEqual(end, -1);
let offset = buffer.readUInt32LE(end + 16); const entries = new Map();
for (let n = 0; n < buffer.readUInt16LE(end + 10); n++) {
  assert.equal(buffer.readUInt32LE(offset), 0x02014b50);
  const method = buffer.readUInt16LE(offset + 10), length = buffer.readUInt32LE(offset + 20), nameLength = buffer.readUInt16LE(offset + 28);
  const extra = buffer.readUInt16LE(offset + 30), comment = buffer.readUInt16LE(offset + 32), local = buffer.readUInt32LE(offset + 42);
  const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
  assert.ok(!name.includes('..') && !name.includes('\\') && !name.startsWith('/') && !entries.has(name));
  const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
  const data = buffer.subarray(start, start + length); assert.ok([0, 8].includes(method));
  entries.set(name, method === 8 ? inflateRawSync(data) : data); offset += 46 + nameLength + extra + comment;
}
const expected = readdirSync(new URL('extension/', root)).sort();
assert.deepEqual([...entries.keys()].sort(), expected);
for (const name of expected) assert.deepEqual(entries.get(name), readFileSync(new URL(`extension/${name}`, root)));
const manifest = JSON.parse(entries.get('manifest.json').toString('utf8'));
const appVersion=readFileSync(new URL('src/lib/version.ts',root),'utf8').match(/\bAPP_VERSION\s*=\s*['"](v\d+\.\d+)['"]/ )?.[1];
assert.ok(appVersion,'Declared app version is required');
assert.equal(manifest.version_name, appVersion); assert.equal(manifest.version, JSON.parse(readFileSync(new URL('package.json', root))).version);
assert.deepEqual(buffer, readFileSync(new URL(`public/downloads/blog-neighbor-care-extension-${manifest.version_name}.zip`, root)));
const result = { checkedAt: new Date().toISOString(), archive: 'public/downloads/blog-neighbor-care-extension-latest.zip',
  version: manifest.version_name, entries: expected, sourceBytesMatched: true, latestMatchesVersioned: true,
  bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'), installedInBrowser: false, deployed: false };
writeFileSync(new URL('docs/evidence/extension-archive-current.json', root), JSON.stringify(result, null, 2)+'\n');
console.log(JSON.stringify(result));
