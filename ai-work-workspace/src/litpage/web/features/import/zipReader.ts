// 큰 ZIP(50MiB 초과) 가져오기 — 브라우저에서 ZIP을 통째로 메모리에 올리지 않고 읽는다(2026-11-19 WS-20261119-02,
// 플랜 docs/PLAN_20261119_LARGE_ZIP_IMPORT.md §3·§11). 끝부분의 목록(중앙 디렉터리)만 먼저 읽고, 항목은 필요한 구간만 잘라
// 브라우저 내장 DecompressionStream으로 푼다. 새 라이브러리 없음. 이름 규칙은 서버 readZip과 같은 공용 함수를 쓴다.
// Blob·DecompressionStream만 쓰므로 Node(시험)에서도 그대로 돈다.
import { ZIP_IMAGE_EXT, ZIP_IMPORT_LIMITS, ZIP_PAGE_EXT, normalizeZipName, slashZipName, zipNameHidden, zipNameSkipped, zipPathTooLong } from '#shared/zipPath.ts';

export class ZipReadError extends Error {}

export interface ZipItem {
  /** 정규화한 이름(서버가 보는 이름과 같다) */
  name: string;
  /** 목록에 적힌 풀린 크기 — 믿지 않고 읽을 때 다시 센다 */
  size: number;
  compSize: number;
  method: number;
  encrypted: boolean;
  localOffset: number;
  /** 이 항목이 든 ZIP(겹친 ZIP이면 안쪽 ZIP) */
  source: Blob;
}

export type SkipReason = 'too_large' | 'unsupported' | 'encrypted' | 'bad_method' | 'path' | 'duplicate' | 'nested_zip' | 'hidden';
export interface ZipPlan {
  pages: ZipItem[];
  images: ZipItem[];
  skipped: { name: string; reason: SkipReason }[];
}

const u16 = (v: DataView, o: number) => v.getUint16(o, true);
const u32 = (v: DataView, o: number) => v.getUint32(o, true);
const bytesOf = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

/** 목록(중앙 디렉터리)만 읽는다. 폴더·맥 찌꺼기는 서버와 같은 규칙으로 뺀다 */
export async function readZipIndex(file: Blob, maxEntries: number = ZIP_IMPORT_LIMITS.entries): Promise<ZipItem[]> {
  const tailLen = Math.min(file.size, 22 + 0xffff);
  const tail = await bytesOf(file.slice(file.size - tailLen));
  const tv = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (u32(tv, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ZipReadError('Not a zip archive');
  const count = u16(tv, eocd + 10);
  const cdSize = u32(tv, eocd + 12);
  const cdOffset = u32(tv, eocd + 16);
  // ZIP64(항목 65,535개 이상·4GiB 이상)는 읽지 않는다 — 서버도 읽지 못하는 형식이다
  if (count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) throw new ZipReadError('ZIP64 archives aren’t supported');
  if (count > maxEntries) throw new ZipReadError('Too many files in archive');
  if (cdOffset + cdSize > file.size) throw new ZipReadError('Corrupt zip central directory');
  const cd = await bytesOf(file.slice(cdOffset, cdOffset + cdSize));
  const v = new DataView(cd.buffer, cd.byteOffset, cd.byteLength);
  const utf8 = new TextDecoder('utf-8');
  const out: ZipItem[] = [];
  let off = 0;
  for (let i = 0; i < count; i++) {
    if (off + 46 > cd.length || u32(v, off) !== 0x02014b50) throw new ZipReadError('Corrupt zip central directory');
    const flags = u16(v, off + 8);
    const method = u16(v, off + 10);
    const compSize = u32(v, off + 20);
    const size = u32(v, off + 24);
    const nameLen = u16(v, off + 28);
    const extraLen = u16(v, off + 30);
    const commentLen = u16(v, off + 32);
    const localOffset = u32(v, off + 42);
    const raw = slashZipName(utf8.decode(cd.subarray(off + 46, off + 46 + nameLen)));
    off += 46 + nameLen + extraLen + commentLen;
    if (zipNameSkipped(raw)) continue;
    if (compSize === 0xffffffff || size === 0xffffffff || localOffset === 0xffffffff) throw new ZipReadError('ZIP64 archives aren’t supported');
    out.push({ name: normalizeZipName(raw), size, compSize, method, encrypted: (flags & 1) === 1, localOffset, source: file });
  }
  return out;
}

/** 항목의 압축된 구간(Blob) — 본문 위치는 항목 앞의 작은 머리글에서 읽는다 */
async function compressedBlob(e: ZipItem): Promise<Blob> {
  const head = await bytesOf(e.source.slice(e.localOffset, e.localOffset + 30));
  const hv = new DataView(head.buffer, head.byteOffset, head.byteLength);
  if (head.length < 30 || u32(hv, 0) !== 0x04034b50) throw new ZipReadError('Corrupt zip local header');
  const start = e.localOffset + 30 + u16(hv, 26) + u16(hv, 28);
  if (start + e.compSize > e.source.size) throw new ZipReadError('Corrupt zip entry size');
  return e.source.slice(start, start + e.compSize);
}

/**
 * 항목 하나를 푼다. 푸는 동안 나온 바이트를 세어 `cap`을 넘는 순간 멈춘다(목록에 적힌 크기를 믿지 않는다).
 * 넘으면 null. 암호·지원하지 않는 압축 방식은 예외.
 */
export async function readZipEntry(e: ZipItem, cap: number): Promise<Uint8Array | null> {
  if (e.encrypted) throw new ZipReadError('Encrypted entry');
  if (e.method !== 0 && e.method !== 8) throw new ZipReadError(`Unsupported zip compression method ${e.method}`);
  const blob = await compressedBlob(e);
  if (e.method === 0) return blob.size > cap ? null : bytesOf(blob);
  const reader = (blob.stream() as ReadableStream<Uint8Array>).pipeThrough(new DecompressionStream('deflate-raw') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.byteLength;
  }
  return out;
}

/**
 * ZIP을 「글 파일 / 그림 / 건너뛴 것」으로 나눈다. 서버 zipSpecs의 규칙을 따른다:
 * 숨김 항목 제외, 글 파일이 없고 안에 ZIP만 있으면(노션의 Export-….zip) 한 겹만 푼다.
 * 큰 ZIP 경로에서만 다른 점(플랜 §11): 같은 이름이 둘이면 **첫 항목만** 쓰고 나머지는 건너뛴 목록에 적는다.
 */
export async function planLargeZip(file: Blob): Promise<ZipPlan> {
  const L = ZIP_IMPORT_LIMITS;
  if (file.size > L.zipBytes) throw new ZipReadError('ZIP is larger than 1 GB');
  const skipped: ZipPlan['skipped'] = [];
  let entries = await readZipIndex(file);
  let budget = L.entries - entries.length;
  const hiddenOut = (list: ZipItem[]) => list.filter((e) => {
    if (!zipNameHidden(e.name)) return true;
    skipped.push({ name: e.name, reason: 'hidden' });
    return false;
  });
  entries = hiddenOut(entries);
  const inner = entries.filter((e) => /\.zip$/i.test(e.name));
  if (inner.length && entries.every((e) => /\.zip$/i.test(e.name) || !ZIP_PAGE_EXT.test(e.name))) {
    const flat: ZipItem[] = [];
    for (const z of inner) {
      if (z.encrypted || (z.method !== 0 && z.method !== 8)) throw new ZipReadError('Unsupported zip compression method');
      let blob: Blob;
      if (z.method === 0) blob = await compressedBlob(z); // 압축 없이 든 ZIP은 구간 그대로(메모리에 올리지 않음)
      else {
        if (z.size > L.innerZipBytes) throw new ZipReadError('The ZIP inside this ZIP is too large — unzip the outer file and import the inner ZIP');
        const data = await readZipEntry(z, L.innerZipBytes);
        if (!data) throw new ZipReadError('The ZIP inside this ZIP is too large — unzip the outer file and import the inner ZIP');
        blob = new Blob([data as BlobPart]);
      }
      const items = await readZipIndex(blob, Math.max(0, budget));
      budget -= items.length;
      flat.push(...items);
    }
    entries = hiddenOut(flat);
  }
  const seen = new Set<string>();
  const pages: ZipItem[] = [];
  const images: ZipItem[] = [];
  for (const e of entries) {
    if (!e.name) continue;
    if (seen.has(e.name)) {
      skipped.push({ name: e.name, reason: 'duplicate' });
      continue;
    }
    seen.add(e.name);
    const isPage = ZIP_PAGE_EXT.test(e.name);
    const isImage = !isPage && ZIP_IMAGE_EXT.test(e.name);
    if (!isPage && !isImage) {
      skipped.push({ name: e.name, reason: /\.zip$/i.test(e.name) ? 'nested_zip' : 'unsupported' });
      continue;
    }
    if (zipPathTooLong(e.name)) skipped.push({ name: e.name, reason: 'path' });
    else if (e.encrypted) skipped.push({ name: e.name, reason: 'encrypted' });
    else if (e.method !== 0 && e.method !== 8) skipped.push({ name: e.name, reason: 'bad_method' });
    else if (isImage && e.size > L.fileBytes) skipped.push({ name: e.name, reason: 'too_large' });
    else (isPage ? pages : images).push(e);
  }
  return { pages, images, skipped };
}

// ---- 글 파일 묶음(작은 ZIP) 쓰기: 압축 없이 담는다(서버 readZip이 읽는 가장 단순한 모양)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function buildStoredZip(entries: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const parts: BlobPart[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x800, true); // UTF-8 이름
    lv.setUint16(8, 0, true); // 압축 없음
    lv.setUint32(14, crc, true);
    lv.setUint32(18, e.data.length, true);
    lv.setUint32(22, e.data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    parts.push(local, e.data as BlobPart);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x800, true);
    cv.setUint16(10, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, e.data.length, true);
    cv.setUint32(24, e.data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length + e.data.length;
  }
  const cdSize = centrals.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  return new Blob([...parts, ...(centrals as BlobPart[]), end], { type: 'application/zip' });
}
