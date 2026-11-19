// 4MiB를 넘어 Storage로 올라간 파일의 가져오기 — WS-20261119-02(Master msg_b6590eaaaee8).
// 예전: 그런 파일은 내용이 DB에 없어 가져오기가 "Upload not found"(404)로 끝났다(재현 c2816bf0f).
// 지금: 가져오기 세 명령(importFiles·previewCsv·mergeCsv)이 권한·횟수 확인 뒤 가져오기 전용 로더로 하나씩 읽는다.
// 가짜 Storage·가짜 내려받기로 확인한다(실제 업로드·실제 네트워크 없음). 로컬 Postgres 전용 fixture만 쓴다.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let fs_: typeof import('../../src/server/fileStorage.ts');
let db: typeof import('../../src/litpage/server/db.ts');
let files: typeof import('../../src/litpage/server/content/files.ts');
let zip: typeof import('../../src/litpage/server/content/zip.ts');
let ratelimit: typeof import('../../src/litpage/server/ratelimit.ts');
const kim = { id: '12121212-1212-4212-8212-121212121212', email: 'stored-kim@example.com', name: '킴' };
const lee = { id: '34343434-3434-4434-8434-343434343434', email: 'stored-lee@example.com', name: '리' };
type M = typeof kim;
const MB = 1024 * 1024;
const spaces = new Map<string, string>();

const objects = new Map<string, Buffer>(); // Storage 경로 → 내용
const fetched: string[] = []; // 내려받은 경로(순서대로)
let inFlight = 0;
let maxInFlight = 0;
let pulled = 0; // 실제로 흘려보낸 바이트
let duringError: unknown = null;
/** 내려받기 동작을 바꿔 끼우는 손잡이 */
const net: { status: number; extra: number; lieLength: number | null; delayMs: number; during: null | (() => Promise<void>) } = { status: 200, extra: 0, lieLength: null, delayMs: 0, during: null };

const fakeStore = () => ({
  getBucket: async () => ({ data: { id: 'workspace-files' }, error: null }),
  createBucket: async () => ({ data: null, error: null }),
  from: (bucket: string) => ({
    createSignedUploadUrl: async (path: string) => ({ data: { signedUrl: `https://store.test/upload/${path}`, token: 't', path }, error: null }),
    list: async (dir: string, o: { search: string }) => ({ data: [...objects.entries()].filter(([p]) => p === `${dir}/${o.search}`).map(([p, b]) => ({ name: p.split('/').pop(), metadata: { size: b.length } })), error: null }),
    createSignedUrl: async (path: string) => ({ data: { signedUrl: `https://store.test/get/${bucket}/${path}` }, error: null }),
    remove: async (paths: string[]) => ({ data: paths.map((name) => ({ name })), error: null }),
  }),
});

const fakeFetch = async (url: string): Promise<Response> => {
  const m = /^https:\/\/store\.test\/get\/([^/]+)\/(.+)$/.exec(url);
  if (!m) return new Response('bad url', { status: 400 });
  const [, bucket, path] = m;
  fetched.push(`${bucket}:${path}`);
  if (net.delayMs) await new Promise((r) => setTimeout(r, net.delayMs));
  // 내려받는 동안(가져오기 명령이 Storage를 기다리는 사이)에 끼워 넣을 일
  if (net.during) {
    const run = net.during;
    net.during = null;
    try {
      await run();
    } catch (e) {
      duringError = e; // 끼워 넣은 일의 실패는 시험이 따로 확인한다(내려받기 실패로 뭉개지지 않게)
      throw e;
    }
  }
  const body = objects.get(path);
  if (net.status !== 200 || !body) return new Response('nope', { status: net.status !== 200 ? net.status : 404 });
  const data = net.extra ? Buffer.concat([body, Buffer.alloc(net.extra, 1)]) : body;
  inFlight++;
  maxInFlight = Math.max(maxInFlight, inFlight);
  let off = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(c) {
      if (off >= data.length) {
        inFlight--;
        return c.close();
      }
      const chunk = data.subarray(off, Math.min(off + MB, data.length));
      off += chunk.length;
      pulled += chunk.length;
      c.enqueue(new Uint8Array(chunk));
    },
    cancel() {
      inFlight--;
    },
  }, { highWaterMark: 0 });
  return new Response(stream, { status: 200, headers: { 'content-length': String(net.lieLength ?? data.length) } });
};

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  fs_ = await import('../../src/server/fileStorage.ts');
  db = await import('../../src/litpage/server/db.ts');
  files = await import('../../src/litpage/server/content/files.ts');
  zip = await import('../../src/litpage/server/content/zip.ts');
  ratelimit = await import('../../src/litpage/server/ratelimit.ts');
  fs_.setFileStorageForTests({ store: fakeStore as never, quota: async () => ({ allowed: true, message: null, upgradeUrl: '' }), fetch: fakeFetch });
  for (const m of [kim, lee]) {
    await runtime.runRpc('loadAccountData', {}, m);
    const r = await runtime.runRpc('createWorkspace', { name: `${m.name} 저장소 시험` }, m);
    const id = (r.body as any).spaceId ?? (r.body as any).space?.id ?? (r.body as any).id;
    expect(id).toBeTruthy();
    spaces.set(m.id, id);
  }
});

beforeEach(() => {
  fetched.length = 0;
  inFlight = 0;
  maxInFlight = 0;
  pulled = 0;
  Object.assign(net, { status: 200, extra: 0, lieLength: null, delayMs: 0, during: null });
  duringError = null;
  // 이 파일은 한 회원으로 큰 파일을 여러 번 올린다 — 사례끼리 횟수 제한이 이어지지 않게 비운다(제한 자체는 fileStorage.test.ts가 확인)
  for (const m of [kim, lee]) for (const k of [`upload-large:user:${m.id}`, `import-stored:${m.id}`, `import:${m.id}`]) ratelimit.reset(k);
});

const sp = (m: M) => spaces.get(m.id)!;
/** 압축되지 않는 채움(크기를 4MiB 위로 올리는 용도) */
function noise(bytes: number, seed = 1): Buffer {
  const b = Buffer.alloc(bytes);
  let x = seed >>> 0 || 1;
  for (let i = 0; i + 4 <= b.length; i += 4) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    b.writeUInt32LE(x, i);
  }
  return b;
}

/** 화면이 하는 순서 그대로: 올리기 주소 받기 → Storage에 올라감 → 끝 알림 */
async function signOnly(m: M, name: string, data: Buffer, type = 'application/octet-stream') {
  const signed = await fs_.signLargeUpload(m, { name, type, size: data.length, spaceId: sp(m) });
  expect(signed.status).toBe(200);
  const path = String(signed.body.uploadUrl).replace('https://store.test/upload/', '');
  objects.set(path, data);
  return { id: String(signed.body.id), path };
}
async function uploadLarge(m: M, name: string, data: Buffer, type?: string) {
  const s = await signOnly(m, name, data, type);
  const done = await fs_.finishLargeUpload(m, { id: s.id });
  expect(done.status).toBe(200);
  return { ...s, url: String(done.body.url) };
}
const importFiles = (m: M, list: { name: string; url: string }[], spaceId = sp(m)) => runtime.runRpc('importFiles', { spaceId, parent: { kind: 'private' }, files: list }, m);
const brief = (r: { status: number; body: unknown }) => ({ status: r.status, message: (r.body as any)?.message, pages: (r.body as any)?.pages, databases: (r.body as any)?.databases });
const titles = (r: { body: unknown }) => {
  const b = r.body as any;
  return (b.pageIds as string[]).map((id) => (b.recordMap.block[id].value.value.properties?.title ?? []).map((d: any) => d[0]).join(''));
};
const bigZip = (title: string, seed = 1) => zip.writeZip([{ name: `${title}.md`, data: `# ${title}\n\n큰 ZIP 안의 문서\n` }, { name: 'filler.bin', data: noise(5 * MB, seed) }]);
const bigHtml = (title: string) => Buffer.from(`<html><head><title>${title}</title></head><body><h1>${title}</h1><p>본문</p><!-- ${noise(3 * MB).toString('base64')} --></body></html>`);
/** 줄은 적고(블록 한도 2만 아래) 칸이 넓은 CSV */
const wideCsv = () => Buffer.from('Name,Note\n' + Array.from({ length: 600 }, (_, i) => `Row ${i},${'설명 '.repeat(1200)}${i}`).join('\n') + '\n');
const bigCsv = () => Buffer.from('Name,Note\n' + Array.from({ length: 60_000 }, (_, i) => `Row ${i},${'설명 '.repeat(12)}${i}`).join('\n') + '\n');

/** 글자 한 줄이 든 가장 작은 PDF에 채움 객체를 붙여 크기를 맞춘다 */
function pdf(text: string, padBytes: number): Buffer {
  const content = `BT /F1 24 Tf 72 720 Td (${text}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${padBytes} >>\nstream\n${'x'.repeat(padBytes)}\nendstream`,
  ];
  let out = '%PDF-1.4\n';
  const offs: number[] = [];
  objs.forEach((o, i) => {
    offs.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

describe('4MiB 넘는 가져오기 파일(Storage 보관) — 읽어서 가져온다', () => {
  it('ZIP 6MiB: 예전 404 → 지금 페이지가 만들어진다', async () => {
    const data = bigZip('Big');
    expect(data.length).toBeGreaterThan(4 * MB);
    const up = await uploadLarge(kim, 'big.zip', data, 'application/zip');
    const r = await importFiles(kim, [{ name: 'big.zip', url: up.url }]);
    expect(brief(r)).toEqual({ status: 200, message: undefined, pages: 1, databases: 0 });
    expect(titles(r)).toEqual(['Big']);
    // 서버 고정 버킷에서, 그 파일 하나만, 한 번 읽었다
    expect(fetched).toEqual([`workspace-files:${up.path}`]);
    expect(pulled).toBe(data.length);
  });

  it('HTML·PDF·CSV도 4MiB를 넘으면 Storage에서 읽어 가져온다', async () => {
    const h = bigHtml('큰 HTML');
    const p = pdf('Hello PDF', 5 * MB);
    const c = wideCsv();
    for (const b of [h, p, c]) expect(b.length).toBeGreaterThan(4 * MB);
    const uh = await uploadLarge(kim, 'big.html', h, 'text/html');
    const up = await uploadLarge(kim, 'big.pdf', p, 'application/pdf');
    const uc = await uploadLarge(kim, 'big.csv', c, 'text/csv');
    const r = await importFiles(kim, [{ name: 'big.html', url: uh.url }, { name: 'big.pdf', url: up.url }, { name: 'big.csv', url: uc.url }]);
    expect(brief(r)).toEqual({ status: 200, message: undefined, pages: 2, databases: 1 });
    expect(titles(r).slice(0, 2)).toEqual(['큰 HTML', 'big']);
    expect(fetched).toHaveLength(3);
    // 큰 파일 여러 개는 하나씩 읽는다(동시에 둘 이상 받지 않음)
    expect(maxInFlight).toBe(1);
  });

  it('previewCsv·mergeCsv도 Storage의 CSV를 읽는다', async () => {
    const c = bigCsv();
    const uc = await uploadLarge(kim, 'rows.csv', c, 'text/csv');
    const pv = await runtime.runRpc('previewCsv', { spaceId: sp(kim), url: uc.url, name: 'rows.csv' }, kim);
    expect(pv.status).toBe(200);
    expect((pv.body as any).rows).toBe(60_000);
    expect((pv.body as any).columns.map((x: any) => x.name)).toEqual(['Name', 'Note']);
    // 합칠 표를 하나 만들고(작은 CSV, DB 보관) 거기에 큰 CSV를 합친다 — 한 번에 1만 줄 한도 문구가 나오면 내용을 읽은 것이다
    const small = db.withRequestCache(() => files.storeFile('t.csv', Buffer.from('Name,Note\nA,1\n'), kim.id, sp(kim), 'text/csv'));
    const made = await importFiles(kim, [{ name: 't.csv', url: small.url }]);
    expect(made.status).toBe(200);
    const blockId = (made.body as any).pageIds[0];
    const mg = await runtime.runRpc('mergeCsv', { blockId, url: uc.url, name: 'rows.csv' }, kim);
    expect(brief(mg)).toMatchObject({ status: 413, message: 'Merge up to 10,000 rows at a time' });
    const fewRows = Buffer.concat([Buffer.from('Name,Note\nB,2\nC,3\n'), Buffer.from(`"${'p'.repeat(5 * MB)}"\n`)]);
    const uf = await uploadLarge(kim, 'few.csv', fewRows, 'text/csv');
    const ok = await runtime.runRpc('mergeCsv', { blockId, url: uf.url, name: 'few.csv' }, kim);
    expect(ok.status).toBe(200);
    expect((ok.body as any).added).toBe(3);
  });
});

describe('확인: 본인·완료·경로·한도·중복', () => {
  it('다른 회원의 Storage 파일은 가져올 수 없고 내려받지도 않는다', async () => {
    const theirs = await uploadLarge(lee, 'lee.zip', bigZip('Lee', 2), 'application/zip');
    const byUrl = await importFiles(kim, [{ name: 'lee.zip', url: theirs.url }]);
    expect(brief(byUrl)).toMatchObject({ status: 404, message: 'Upload not found: lee.zip' });
    const byId = await importFiles(kim, [{ name: 'lee.zip', url: theirs.id }]);
    expect(brief(byId)).toMatchObject({ status: 404, message: 'Upload not found: lee.zip' });
    const pv = await runtime.runRpc('previewCsv', { spaceId: sp(kim), url: theirs.url, name: 'lee.csv' }, kim);
    expect(brief(pv)).toMatchObject({ status: 404 });
    expect(fetched).toEqual([]);
  });

  it('올리기를 끝내지 않은(대기) 파일은 가져올 수 없다', async () => {
    const s = await signOnly(kim, 'pending.zip', bigZip('Pending', 3), 'application/zip');
    const r = await importFiles(kim, [{ name: 'pending.zip', url: `/files/${s.id}/pending.zip` }]);
    expect(brief(r)).toMatchObject({ status: 404, message: 'Upload not found: pending.zip' });
    expect(fetched).toEqual([]);
  });

  it('경로가 본인 폴더가 아닌 줄은 읽지 않는다(줄이 바뀌어 있어도)', async () => {
    const mine = await uploadLarge(kim, 'mine.zip', bigZip('Mine', 4), 'application/zip');
    const theirs = await uploadLarge(lee, 'other.zip', bigZip('Other', 5), 'application/zip');
    db.withRequestCache(() => db.db.prepare('UPDATE files SET storage_path = ? WHERE id = ?').run(theirs.path, mine.id));
    const crossed = await importFiles(kim, [{ name: 'mine.zip', url: mine.url }]);
    expect(brief(crossed)).toMatchObject({ status: 404 });
    db.withRequestCache(() => db.db.prepare('UPDATE files SET storage_path = ? WHERE id = ?').run(`${kim.id}/${mine.id}/../x.zip`, mine.id));
    expect(brief(await importFiles(kim, [{ name: 'mine.zip', url: mine.url }]))).toMatchObject({ status: 404 });
    db.withRequestCache(() => db.db.prepare('UPDATE files SET storage_path = ? WHERE id = ?').run(`${kim.id}/${theirs.id}/mine.zip`, mine.id));
    expect(brief(await importFiles(kim, [{ name: 'mine.zip', url: mine.url }]))).toMatchObject({ status: 404 });
    expect(fetched).toEqual([]);
  });

  it('한 요청에 같은 Storage 파일이 두 번이면 거절한다', async () => {
    const up = await uploadLarge(kim, 'twice.zip', bigZip('Twice', 6), 'application/zip');
    const r = await importFiles(kim, [{ name: 'twice.zip', url: up.url }, { name: 'twice.zip', url: up.id }]);
    expect(brief(r)).toMatchObject({ status: 400, message: 'twice.zip: the same file was added twice' });
    expect(fetched).toHaveLength(1);
  });

  it('기존 파일 한도: 20MB 넘는 PDF는 내려받기 전에 거절한다', async () => {
    const up = await uploadLarge(kim, 'huge.pdf', noise(21 * MB, 7), 'application/pdf');
    const r = await importFiles(kim, [{ name: 'huge.pdf', url: up.url }]);
    expect(brief(r)).toMatchObject({ status: 413, message: 'huge.pdf is larger than 20 MB' });
    expect(fetched).toEqual([]);
  });
});

describe('내려받기 실패와 실제 바이트 한도', () => {
  it('Storage가 실패하면 409로 알리고 페이지를 만들지 않는다', async () => {
    const up = await uploadLarge(kim, 'down.zip', bigZip('Down', 8), 'application/zip');
    net.status = 500;
    const r = await importFiles(kim, [{ name: 'down.zip', url: up.url }]);
    expect(brief(r)).toMatchObject({ status: 409 });
    expect((r.body as any).message).toContain('올린 파일을 읽지 못했습니다');
    expect((r.body as any).pageIds).toBeUndefined();
  });

  it('기록된 크기보다 많이 오면 받는 도중에 끊는다(머리글 크기를 믿지 않는다)', async () => {
    const data = bigZip('Grow', 9);
    const up = await uploadLarge(kim, 'grow.zip', data, 'application/zip');
    net.extra = 20 * MB; // 올린 뒤 내용이 더 커진 경우
    net.lieLength = data.length; // 머리글은 원래 크기라고 말한다
    const r = await importFiles(kim, [{ name: 'grow.zip', url: up.url }]);
    expect(brief(r)).toMatchObject({ status: 409 });
    // 20MiB를 다 받지 않고 한도를 넘는 조각에서 멈췄다
    expect(pulled).toBeLessThanOrEqual(data.length + 2 * MB);
  });

  it('머리글의 크기가 한도를 넘으면 본문을 받지 않는다', async () => {
    const data = bigZip('Declared', 10);
    const up = await uploadLarge(kim, 'declared.zip', data, 'application/zip');
    net.lieLength = data.length + 1;
    const r = await importFiles(kim, [{ name: 'declared.zip', url: up.url }]);
    expect(brief(r)).toMatchObject({ status: 409 });
    expect(pulled).toBe(0);
  });

  it('기록된 크기보다 적게 오면(잘린 내용) 실패로 본다', async () => {
    const data = bigZip('Short', 11);
    const up = await uploadLarge(kim, 'short.zip', data, 'application/zip');
    objects.set(up.path, data.subarray(0, data.length - 10));
    expect(brief(await importFiles(kim, [{ name: 'short.zip', url: up.url }]))).toMatchObject({ status: 409 });
  });

  it('로더 자체 확인: 남의 폴더·이상한 경로·50MiB 넘는 한도는 내려받지 않는다', async () => {
    const mine = await uploadLarge(kim, 'unit.zip', bigZip('Unit', 12), 'application/zip');
    expect(await fs_.readImportUpload(lee.id, mine.path, 50 * MB)).toBeNull();
    expect(await fs_.readImportUpload(kim.id, `${kim.id}/../${lee.id}/x`, 50 * MB)).toBeNull();
    expect(await fs_.readImportUpload(kim.id, `${kim.id}/a/b/c`, 50 * MB)).toBeNull();
    expect(await fs_.readImportUpload(kim.id, mine.path, 50 * MB + 1)).toBeNull();
    expect(await fs_.readImportUpload(kim.id, mine.path, 0)).toBeNull();
    expect(fetched).toEqual([]);
    const ok = await fs_.readImportUpload(kim.id, mine.path, 50 * MB);
    expect(ok?.length).toBe(objects.get(mine.path)!.length);
  });
});

describe('요청끼리 섞이지 않는다', () => {
  it('두 회원이 동시에 가져와도 각자 자기 파일만 읽고 자기 결과만 받는다', async () => {
    const a = await uploadLarge(kim, 'a.zip', bigZip('Kim Doc', 13), 'application/zip');
    const b = await uploadLarge(lee, 'b.zip', bigZip('Lee Doc', 14), 'application/zip');
    net.delayMs = 30;
    const [ra, rb, cross] = await Promise.all([
      importFiles(kim, [{ name: 'a.zip', url: a.url }]),
      importFiles(lee, [{ name: 'b.zip', url: b.url }]),
      importFiles(kim, [{ name: 'b.zip', url: b.url }]), // 남의 요청이 진행 중이어도 남의 파일은 못 쓴다
    ]);
    expect(titles(ra)).toEqual(['Kim Doc']);
    expect(titles(rb)).toEqual(['Lee Doc']);
    expect(brief(cross)).toMatchObject({ status: 404 });
    expect([...fetched].sort()).toEqual([`workspace-files:${a.path}`, `workspace-files:${b.path}`].sort());
  });

  it('읽은 내용은 남지 않는다: 같은 파일을 다시 가져오면 다시 내려받는다', async () => {
    const up = await uploadLarge(kim, 'again.zip', bigZip('Again', 15), 'application/zip');
    expect((await importFiles(kim, [{ name: 'again.zip', url: up.url }])).status).toBe(200);
    expect((await importFiles(kim, [{ name: 'again.zip', url: up.url }])).status).toBe(200);
    expect(fetched).toHaveLength(2);
    // 가져오기 밖의 읽기 경로는 예전 그대로 내용을 얻지 못한다(공용 보관 없음)
    expect(db.withRequestCache(() => files.readFileContent(up.id))).toBeNull();
    expect(db.withRequestCache(() => files.readStoredFile(up.url, kim.id))).toBeNull();
  });
});

describe('DB에 든 작은 파일은 예전 그대로(내려받기 없음)', () => {
  it('Markdown·HTML·CSV·ZIP·PDF', async () => {
    const put = (name: string, data: Buffer | string, mime: string) => db.withRequestCache(() => files.storeFile(name, data, kim.id, sp(kim), mime));
    const list = [
      put('small.md', '# Small MD\n\n본문\n', 'text/markdown'),
      put('small.html', '<html><head><title>Small HTML</title></head><body><p>본문</p></body></html>', 'text/html'),
      put('small.csv', 'Name,Qty\nA,1\nB,2\n', 'text/csv'),
      put('small.zip', zip.writeZip([{ name: 'In Zip.md', data: '# In Zip\n' }]), 'application/zip'),
      put('small.pdf', pdf('Small PDF', 10), 'application/pdf'),
    ];
    const r = await importFiles(kim, list.map((f) => ({ name: f.name, url: f.url })));
    expect(brief(r)).toEqual({ status: 200, message: undefined, pages: 4, databases: 1 });
    const pv = await runtime.runRpc('previewCsv', { spaceId: sp(kim), url: list[2].url, name: 'small.csv' }, kim);
    expect((pv.body as any).rows).toBe(2);
    expect(fetched).toEqual([]);
  });
});

// 2026-11-19 Mac 검수 P2(Master msg_b5baddc12f26): Storage를 기다리는 사이에 같은 표가 바뀌어도 변경이 사라지지 않아야 한다.
describe('Storage를 기다리는 사이의 동시 변경', () => {
  const rec = <T = any>(table: string, id: string) => db.withRequestCache(() => db.getRecord(table as never, id) as T);
  const patchRecord = (table: string, id: string, change: (r: any) => void) => db.withRequestCache(() => {
    const r = JSON.parse((db.db.prepare('SELECT data FROM records WHERE tbl = ? AND id = ?').get(table, id) as { data: string }).data);
    change(r);
    db.db.prepare('UPDATE records SET data = ? WHERE tbl = ? AND id = ?').run(JSON.stringify(r), table, id);
  });
  const rowCount = (colId: string) => db.withRequestCache(() => Number((db.db.prepare("SELECT COUNT(*) AS n FROM records WHERE tbl = 'block' AND parent_id = ? AND alive = 1").get(colId) as { n: number }).n));
  const put = (name: string, text: string) => db.withRequestCache(() => files.storeFile(name, Buffer.from(text), kim.id, sp(kim), 'text/csv'));
  /** 4MiB를 넘기는 채움 열(무시되는 열)을 붙인 CSV — Storage로 올라가게 한다 */
  const storedCsv = (head: string, lines: string[]) => Buffer.from(`${head},Pad\n${lines.map((l, i) => `${l},${i === 0 ? 'p'.repeat(5 * MB) : ''}`).join('\n')}\n`);
  async function makeTable(title: string) {
    const f = put(`${title}.csv`, 'Name,Status\nOne,Open\n');
    const r = await runtime.runRpc('importFiles', { spaceId: sp(kim), parent: { kind: 'private' }, files: [{ name: `${title}.csv`, url: f.url }], csvTypes: { 1: 'select' } }, kim);
    expect(r.status).toBe(200);
    const blockId = (r.body as any).pageIds[0] as string;
    const colId = rec('block', blockId).collection_id as string;
    return { blockId, colId };
  }
  const schemaNames = (colId: string) => Object.values(rec('collection', colId).schema as Record<string, any>).map((p) => p.name).sort();
  const statusOptions = (colId: string) => (Object.values(rec('collection', colId).schema as Record<string, any>).find((p) => p.name === 'Status')!.options as { value: string }[]).map((o) => o.value).sort();

  it('같은 표에 두 요청: 한쪽이 Storage를 기다리는 사이 다른 쪽이 더한 열·옵션이 사라지지 않는다', async () => {
    const t = await makeTable('Race');
    const a = await uploadLarge(kim, 'a.csv', storedCsv('Name,Status,ColA', ['FromA,Alpha,a1', 'FromA2,Open,a2']), 'text/csv');
    const small = put('b.csv', 'Name,Status,ColB\nFromB,Beta,b1\n');
    let bResult: { status: number; body: unknown } | undefined;
    net.during = async () => {
      // A가 파일을 받는 동안 B가 끝까지 처리된다(새 열 ColB, 새 옵션 Beta)
      bResult = await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: small.url, name: 'b.csv' }, kim);
    };
    const aResult = await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: a.url, name: 'a.csv' }, kim);
    expect(bResult?.status).toBe(200);
    expect((bResult!.body as any).newProperties).toEqual(['ColB']);
    expect(aResult.status).toBe(200);
    expect((aResult.body as any).newProperties.sort()).toEqual(['ColA', 'Pad']);
    // 열 유실 0: 두 요청이 더한 열이 모두 남아 있다
    expect(schemaNames(t.colId)).toEqual(['ColA', 'ColB', 'Name', 'Pad', 'Status']);
    // 옵션 유실 0
    expect(statusOptions(t.colId)).toEqual(['Alpha', 'Beta', 'Open']);
    // 줄: 처음 1 + B 1 + A 2
    expect(rowCount(t.colId)).toBe(4);
    // 표 보기의 열 목록에도 둘 다 들어 있다
    const block = rec('block', t.blockId);
    const view = rec('collection_view', block.view_ids[0]);
    const schema = rec('collection', t.colId).schema as Record<string, any>;
    const shown = (view.format.table_properties as { property: string }[]).map((p) => schema[p.property]?.name).filter(Boolean);
    expect(shown).toEqual(expect.arrayContaining(['ColA', 'ColB']));
  });

  it('순서가 반대여도 같다: Storage 요청이 먼저 끝나고 작은 요청이 뒤에 와도 열이 모두 남는다', async () => {
    const t = await makeTable('Order');
    const a = await uploadLarge(kim, 'a2.csv', storedCsv('Name,Status,ColA', ['FromA,Alpha,a1']), 'text/csv');
    const small = put('b2.csv', 'Name,Status,ColB\nFromB,Beta,b1\n');
    const [ra, rb] = await Promise.all([
      runtime.runRpc('mergeCsv', { blockId: t.blockId, url: a.url, name: 'a2.csv' }, kim),
      runtime.runRpc('mergeCsv', { blockId: t.blockId, url: small.url, name: 'b2.csv' }, kim),
    ]);
    expect([ra.status, rb.status]).toEqual([200, 200]);
    expect(schemaNames(t.colId)).toEqual(['ColA', 'ColB', 'Name', 'Pad', 'Status']);
    expect(statusOptions(t.colId)).toEqual(['Alpha', 'Beta', 'Open']);
    expect(rowCount(t.colId)).toBe(3);
  });

  it('기다리는 사이 권한을 잃으면 합치지 않는다(mergeCsv)', async () => {
    const t = await makeTable('Perm');
    const a = await uploadLarge(kim, 'perm.csv', storedCsv('Name,Status,ColA', ['FromA,Alpha,a1']), 'text/csv');
    const spaceId = sp(kim);
    const before = rec('space', spaceId).permissions;
    net.during = async () => patchRecord('space', spaceId, (r) => { r.permissions = (r.permissions ?? []).filter((p: any) => p.user_id !== kim.id); });
    const r = await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: a.url, name: 'perm.csv' }, kim);
    patchRecord('space', spaceId, (x) => { x.permissions = before; });
    expect([403, 404]).toContain(r.status);
    expect(schemaNames(t.colId)).toEqual(['Name', 'Status']);
    expect(rowCount(t.colId)).toBe(1);
  });

  it('기다리는 사이 표의 보기가 바뀌면 충돌로 멈춘다(잠그지 않은 것을 고치지 않는다)', async () => {
    const t = await makeTable('Views');
    const a = await uploadLarge(kim, 'views.csv', storedCsv('Name,Status,ColA', ['FromA,Alpha,a1']), 'text/csv');
    const orig = rec('block', t.blockId).view_ids as string[];
    net.during = async () => patchRecord('block', t.blockId, (r) => { r.view_ids = [...r.view_ids, '00000000-0000-4000-8000-00000000abcd']; });
    const r = await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: a.url, name: 'views.csv' }, kim);
    patchRecord('block', t.blockId, (x) => { x.view_ids = orig; });
    expect(brief(r)).toMatchObject({ status: 409 });
    expect((r.body as any).message).toContain('표가 바뀌었습니다');
    expect(schemaNames(t.colId)).toEqual(['Name', 'Status']);
    expect(rowCount(t.colId)).toBe(1);
  });

  it('기다리는 사이 권한을 잃으면 페이지를 만들지 않는다(importFiles)', async () => {
    const up = await uploadLarge(kim, 'gone.zip', bigZip('Gone', 21), 'application/zip');
    const spaceId = sp(kim);
    const before = rec('space', spaceId).permissions;
    const pagesBefore = db.withRequestCache(() => Number((db.db.prepare("SELECT COUNT(*) AS n FROM records WHERE tbl = 'block' AND space_id = ?").get(spaceId) as { n: number }).n));
    net.during = async () => patchRecord('space', spaceId, (r) => { r.permissions = (r.permissions ?? []).filter((p: any) => p.user_id !== kim.id); });
    const r = await importFiles(kim, [{ name: 'gone.zip', url: up.url }]);
    patchRecord('space', spaceId, (x) => { x.permissions = before; });
    expect(brief(r)).toMatchObject({ status: 403, message: 'Not a member of this workspace' });
    const pagesAfter = db.withRequestCache(() => Number((db.db.prepare("SELECT COUNT(*) AS n FROM records WHERE tbl = 'block' AND space_id = ?").get(spaceId) as { n: number }).n));
    expect(pagesAfter).toBe(pagesBefore);
  });

  it('기다리는 사이 대상 페이지가 지워지면 그 페이지에 넣지 않는다(importFiles)', async () => {
    const host = put('Host.csv', 'Name\nx\n');
    const made = await runtime.runRpc('importFiles', { spaceId: sp(kim), parent: { kind: 'private' }, files: [{ name: 'Host.md', url: db.withRequestCache(() => files.storeFile('Host.md', '# Host\n', kim.id, sp(kim), 'text/markdown')).url }] }, kim);
    void host;
    const pageId = (made.body as any).pageIds[0] as string;
    const up = await uploadLarge(kim, 'into.zip', bigZip('Into', 22), 'application/zip');
    net.during = async () => patchRecord('block', pageId, (r) => { r.alive = false; });
    const r = await runtime.runRpc('importFiles', { spaceId: sp(kim), parent: { kind: 'page', pageId }, files: [{ name: 'into.zip', url: up.url }] }, kim);
    expect(brief(r)).toMatchObject({ status: 403, message: 'You can’t import into this page' });
    expect(rec('block', pageId).content ?? []).toEqual([]);
  });

  it('previewCsv는 기다린 뒤의 열 목록을 보여 준다', async () => {
    const t = await makeTable('Preview');
    const a = await uploadLarge(kim, 'pv.csv', storedCsv('Name,Status', ['x,Open']), 'text/csv');
    const small = put('add.csv', 'Name,Later\ny,1\n');
    net.during = async () => {
      expect((await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: small.url, name: 'add.csv' }, kim)).status).toBe(200);
    };
    const pv = await runtime.runRpc('previewCsv', { spaceId: sp(kim), url: a.url, name: 'pv.csv', blockId: t.blockId }, kim);
    expect(pv.status).toBe(200);
    expect(((pv.body as any).target.properties as { name: string }[]).map((p) => p.name)).toContain('Later');
  });

  // 2026-11-19 Mac 검수 후속(Master msg_74f8e5339487)
  const propId = (colId: string, name: string) => Object.entries(rec('collection', colId).schema as Record<string, any>).find(([, p]) => p.name === name)?.[0];
  /** Name·Status에 글자 열 ColX를 하나 더한 표 */
  async function tableWithColX(title: string) {
    const t = await makeTable(title);
    const add = put(`${title}-x.csv`, 'Name,ColX\nTwo,x0\n');
    expect((await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: add.url, name: 'x.csv' }, kim)).status).toBe(200);
    return { ...t, colX: propId(t.colId, 'ColX')! };
  }

  it('직접 고른 열이 기다리는 사이 사라지면 같은 이름의 새 열을 만들지 않고 409로 멈춘다', async () => {
    const t = await tableWithColX('Mapped');
    const a = await uploadLarge(kim, 'mapped.csv', storedCsv('Name,Status,Whatever', ['FromA,Alpha,v1']), 'text/csv');
    net.during = async () => patchRecord('collection', t.colId, (r) => { delete r.schema[t.colX]; });
    const r = await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: a.url, name: 'mapped.csv', mapping: { 2: t.colX } }, kim);
    expect(brief(r)).toMatchObject({ status: 409 });
    expect((r.body as any).message).toContain('선택한 열이 바뀌었습니다');
    // 열: 다른 쪽이 지운 그대로이고 Whatever·Pad 같은 새 열이 생기지 않았다. 옵션(Alpha)도 줄도 그대로
    expect(schemaNames(t.colId)).toEqual(['Name', 'Status']);
    expect(statusOptions(t.colId)).toEqual(['Open']);
    expect(rowCount(t.colId)).toBe(2);
  });

  it('직접 고른 열이 기다리는 사이 넣을 수 없는 종류로 바뀌어도 409로 멈춘다', async () => {
    const t = await tableWithColX('Retyped');
    const a = await uploadLarge(kim, 'retyped.csv', storedCsv('Name,Status,Whatever', ['FromA,Alpha,v1']), 'text/csv');
    net.during = async () => patchRecord('collection', t.colId, (r) => { r.schema[t.colX].type = 'formula'; });
    const r = await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: a.url, name: 'retyped.csv', mapping: { 2: t.colX } }, kim);
    expect(brief(r)).toMatchObject({ status: 409 });
    expect(schemaNames(t.colId)).toEqual(['ColX', 'Name', 'Status']);
    expect(statusOptions(t.colId)).toEqual(['Open']);
    expect(rowCount(t.colId)).toBe(2);
  });

  // Master msg_2710ce16b617: 넣을 수 있는 종류끼리 바뀐 경우(글자 → 숫자)
  const cellOf = (colId: string, title: string, prop: string) => db.withRequestCache(() => {
    const rows = db.db.prepare("SELECT data FROM records WHERE tbl = 'block' AND parent_id = ? AND alive = 1").all(colId) as { data: string }[];
    const row = rows.map((r) => JSON.parse(r.data)).find((b) => (b.properties?.title ?? []).map((d: any) => d[0]).join('') === title);
    return row ? (row.properties?.[prop] ?? []).map((d: any) => d[0]).join('') : undefined;
  });

  it('직접 고른 열이 기다리는 사이 글자 → 숫자로 바뀌면 409로 멈춘다(「00723」을 723으로 넣지 않는다)', async () => {
    const t = await tableWithColX('TextToNumber');
    const a = await uploadLarge(kim, 'codes.csv', storedCsv('Name,Status,Code', ['FromA,Alpha,00723']), 'text/csv');
    net.during = async () => patchRecord('collection', t.colId, (r) => { r.schema[t.colX].type = 'number'; });
    const r = await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: a.url, name: 'codes.csv', mapping: { 2: t.colX, 3: 'skip' } }, kim);
    expect(brief(r)).toMatchObject({ status: 409 });
    expect((r.body as any).message).toContain('선택한 열이 바뀌었습니다');
    // 쓰기 0: 줄·옵션·열 이름 그대로(종류는 다른 쪽이 바꾼 number)
    expect(rowCount(t.colId)).toBe(2);
    expect(statusOptions(t.colId)).toEqual(['Open']);
    expect(schemaNames(t.colId)).toEqual(['ColX', 'Name', 'Status']);
    expect(cellOf(t.colId, 'FromA', t.colX)).toBeUndefined();
  });

  it('직접 고른 열이 숫자 → 글자로 바뀌어도 409로 멈춘다', async () => {
    const t = await tableWithColX('NumberToText');
    patchRecord('collection', t.colId, (r) => { r.schema[t.colX].type = 'number'; });
    const a = await uploadLarge(kim, 'nums.csv', storedCsv('Name,Status,Qty', ['FromA,Alpha,"1,200"']), 'text/csv');
    net.during = async () => patchRecord('collection', t.colId, (r) => { r.schema[t.colX].type = 'text'; });
    const r = await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: a.url, name: 'nums.csv', mapping: { 2: t.colX, 3: 'skip' } }, kim);
    expect(brief(r)).toMatchObject({ status: 409 });
    expect(rowCount(t.colId)).toBe(2);
    expect(statusOptions(t.colId)).toEqual(['Open']);
  });

  it('회귀: 직접 고른 글자 열이 그대로면 「00723」을 글자 그대로 넣는다(이름·옵션만 바뀐 것은 종류 변경이 아니다)', async () => {
    const t = await tableWithColX('SameType');
    const a = await uploadLarge(kim, 'same.csv', storedCsv('Name,Status,Code', ['FromA,Alpha,00723']), 'text/csv');
    // 기다리는 사이 열 이름만 바뀐다(종류는 그대로 text)
    net.during = async () => patchRecord('collection', t.colId, (r) => { r.schema[t.colX].name = 'ColX renamed'; });
    const r = await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: a.url, name: 'same.csv', mapping: { 2: t.colX, 3: 'skip' } }, kim);
    expect(r.status).toBe(200);
    expect((r.body as any).newProperties).toEqual([]);
    expect(cellOf(t.colId, 'FromA', t.colX)).toBe('00723');
    expect(schemaNames(t.colId)).toEqual(['ColX renamed', 'Name', 'Status']);
    expect(rowCount(t.colId)).toBe(3);
  });

  it('회귀: 자동 연결(지정 없음)은 대기 중 종류가 바뀌어도 예전처럼 최신 종류로 넣는다', async () => {
    const t = await tableWithColX('AutoMap');
    const a = await uploadLarge(kim, 'auto.csv', storedCsv('Name,ColX', ['FromA,00723']), 'text/csv');
    net.during = async () => patchRecord('collection', t.colId, (r) => { r.schema[t.colX].type = 'number'; });
    const r = await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: a.url, name: 'auto.csv' }, kim);
    expect(r.status).toBe(200);
    expect(rowCount(t.colId)).toBe(3);
    expect(cellOf(t.colId, 'FromA', t.colX)).toBe('723');
  });

  it('회귀: 직접 고른 열이 그대로 있으면 그 열에 넣는다(머리글 이름의 새 열 없음)', async () => {
    const t = await tableWithColX('Kept');
    const a = await uploadLarge(kim, 'kept.csv', storedCsv('Name,Status,Whatever', ['FromA,Alpha,v1']), 'text/csv');
    const r = await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: a.url, name: 'kept.csv', mapping: { 2: t.colX, 3: 'skip' } }, kim);
    expect(r.status).toBe(200);
    expect((r.body as any).newProperties).toEqual([]);
    expect(schemaNames(t.colId)).toEqual(['ColX', 'Name', 'Status']);
    expect(statusOptions(t.colId)).toEqual(['Alpha', 'Open']);
    expect(rowCount(t.colId)).toBe(3);
  });

  it('회귀: 건너뛰기·새 열·자동 연결은 예전 그대로', async () => {
    const t = await tableWithColX('Modes');
    // 열: 0 Name(자동·제목) 1 Status(자동·있는 열) 2 Keep(자동·없는 열 → 새 글자 열) 3 Drop(건너뜀) 4 ColX(「새 열」 지정 → 같은 이름이 있어도 새로) 5 Pad(자동)
    const a = await uploadLarge(kim, 'modes.csv', storedCsv('Name,Status,Keep,Drop,ColX', ['FromA,Zed,k1,d1,n1']), 'text/csv');
    const r = await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: a.url, name: 'modes.csv', mapping: { 3: 'skip', 4: 'new' } }, kim);
    expect(r.status).toBe(200);
    expect(((r.body as any).newProperties as string[]).sort()).toEqual(['ColX', 'Keep', 'Pad']);
    expect(schemaNames(t.colId)).toEqual(['ColX', 'ColX', 'Keep', 'Name', 'Pad', 'Status']);
    expect(statusOptions(t.colId)).toEqual(['Open', 'Zed']);
    expect(rowCount(t.colId)).toBe(3);
  });

  it('회귀: 처음부터 없던 열 id를 지정한 경우는 예전 그대로(머리글 이름의 새 열)', async () => {
    const t = await tableWithColX('Unknown');
    const a = await uploadLarge(kim, 'unknown.csv', storedCsv('Name,Status,Whatever', ['FromA,Open,v1']), 'text/csv');
    const r = await runtime.runRpc('mergeCsv', { blockId: t.blockId, url: a.url, name: 'unknown.csv', mapping: { 2: 'nope', 3: 'skip' } }, kim);
    expect(r.status).toBe(200);
    expect((r.body as any).newProperties).toEqual(['Whatever']);
  });

  it('표를 지정하지 않은 previewCsv도 기다리는 사이 워크스페이스에서 빠지면 내용을 돌려주지 않는다', async () => {
    const a = await uploadLarge(kim, 'secret.csv', storedCsv('Name,Secret', ['x,비밀값']), 'text/csv');
    const spaceId = sp(kim);
    const before = rec('space', spaceId).permissions;
    net.during = async () => patchRecord('space', spaceId, (r) => { r.permissions = (r.permissions ?? []).filter((p: any) => p.user_id !== kim.id); });
    const r = await runtime.runRpc('previewCsv', { spaceId, url: a.url, name: 'secret.csv' }, kim);
    patchRecord('space', spaceId, (x) => { x.permissions = before; });
    expect(brief(r)).toMatchObject({ status: 403, message: 'Not a member of this workspace' });
    expect(JSON.stringify(r.body)).not.toContain('비밀값');
    expect((r.body as any).columns).toBeUndefined();
    // 권한이 그대로면 예전처럼 돌려준다
    const ok = await runtime.runRpc('previewCsv', { spaceId, url: a.url, name: 'secret.csv' }, kim);
    expect(ok.status).toBe(200);
    expect(((ok.body as any).columns as { name: string }[]).map((c) => c.name)).toEqual(['Name', 'Secret', 'Pad']);
  });
});

// 2026-11-19 Master msg_a38d3ff84dbc: 서로 다른 DB 연결 사이의 실제 행 잠금 대기.
// 앱은 동기 DB 다리(연결 하나)를 쓰므로, 시험이 두 번째 연결을 따로 열어 「다른 서버 인스턴스」 역할을 시킨다.
// 두 번째 연결은 한 번에 보낸 문장 묶음으로 컬렉션 줄을 잠그고(FOR UPDATE) 열·옵션을 더한 뒤 2초 쉬었다가 커밋한다.
// (앱 쪽 질의가 잠금을 기다리는 동안에는 이 프로세스의 이벤트 루프가 멈추므로, 커밋까지 DB 서버 안에서 끝나도록 한 묶음으로 보낸다.)
describe('다른 DB 연결이 잡은 행 잠금', () => {
  const rec = <T = any>(table: string, id: string) => db.withRequestCache(() => db.getRecord(table as never, id) as T);
  const HOLD_SEC = 3;

  it('mergeCsv는 다른 연결의 잠금이 풀릴 때까지 기다린 뒤 그 연결이 더한 열·옵션 위에 합친다', async () => {
    const seed = db.withRequestCache(() => files.storeFile('Lock.csv', Buffer.from('Name,Status\nOne,Open\n'), kim.id, sp(kim), 'text/csv'));
    const made = await runtime.runRpc('importFiles', { spaceId: sp(kim), parent: { kind: 'private' }, files: [{ name: 'Lock.csv', url: seed.url }], csvTypes: { 1: 'select' } }, kim);
    expect(made.status).toBe(200);
    const blockId = (made.body as any).pageIds[0] as string;
    const colId = rec('block', blockId).collection_id as string;

    // 다른 연결이 써넣을 값: 지금 스키마 + 새 열 ColB + Status의 새 옵션 Beta
    const col = rec('collection', colId);
    const statusId = Object.entries(col.schema as Record<string, any>).find(([, p]) => p.name === 'Status')![0];
    const next = structuredClone(col);
    next.version = (col.version ?? 0) + 1; // 실제 쓰기처럼 레코드 안의 판 번호도 함께 올린다
    next.last_edited_time = Date.now();
    next.schema.zzcolb = { name: 'ColB', type: 'text' };
    next.schema[statusId].options = [...next.schema[statusId].options, { id: '00000000-0000-4000-8000-0000000be7a0', value: 'Beta', color: 'blue' }];
    const tag = '$lockjson$';
    expect(JSON.stringify(next)).not.toContain(tag);

    const other = postgres(process.env.AWW_DATABASE_URL!, { max: 1, onnotice: () => {} });
    const stored = Buffer.from(`Name,Status,ColA,Pad\nFromA,Alpha,a1,${'p'.repeat(5 * MB)}\n`);
    const up = await uploadLarge(kim, 'lock.csv', stored, 'text/csv');
    let otherDone: Promise<unknown> | undefined;
    let lockTakenAt = 0;
    try {
      // A가 Storage를 기다리는 사이(이미 예전 스키마를 읽어 둔 상태) 다른 연결이 잠금을 잡는다
      net.during = async () => {
        otherDone = other.unsafe(`
          BEGIN;
          SELECT id FROM records WHERE tbl = 'collection' AND id = '${colId}' FOR UPDATE;
          UPDATE records SET data = ${tag}${JSON.stringify(next)}${tag}, version = ${next.version}, last_edited_time = ${next.last_edited_time} WHERE tbl = 'collection' AND id = '${colId}';
          SELECT pg_sleep(${HOLD_SEC});
          COMMIT;
        `).simple().execute(); // execute(): 기다리지 않아도 지금 바로 보낸다
        // 다른 연결이 정말 잠금을 쥘 때까지 세 번째 연결로 확인한다(고정 시간 대기는 부하에 따라 흔들린다). 커밋 전이라 새 열은 아직 보이지 않는다
        const probe = postgres(process.env.AWW_DATABASE_URL!, { max: 1, onnotice: () => {} });
        try {
          let locked = [{}] as unknown[];
          for (let i = 0; i < 100 && locked.length; i++) {
            locked = await probe.unsafe(`SELECT id FROM records WHERE tbl = 'collection' AND id = '${colId}' FOR UPDATE SKIP LOCKED`);
            if (locked.length) await new Promise((r) => setTimeout(r, 30));
          }
          expect(locked.length).toBe(0); // 건너뜀 = 누군가 잠금 보유
          const visible = await probe.unsafe(`SELECT data FROM records WHERE tbl = 'collection' AND id = '${colId}'`);
          expect(String(visible[0].data)).not.toContain('ColB');
        } finally {
          await probe.end();
        }
        lockTakenAt = Date.now();
      };
      const r = await runtime.runRpc('mergeCsv', { blockId, url: up.url, name: 'lock.csv' }, kim);
      const waitedMs = Date.now() - lockTakenAt;
      if (duringError) throw duringError;
      await otherDone;
      expect({ status: r.status, message: (r.body as any)?.message }).toEqual({ status: 200, message: undefined });
      // 실제로 기다렸다: 잠금을 확인한 시점부터 다른 연결이 쉬는 시간의 대부분이 지나서야 끝났다
      expect(waitedMs).toBeGreaterThanOrEqual((HOLD_SEC - 1.5) * 1000);
      // 다른 연결이 더한 열·옵션이 남아 있고, 우리 것이 그 위에 합쳐졌다
      const after = rec('collection', colId);
      const names = Object.values(after.schema as Record<string, any>).map((p) => p.name).sort();
      expect(names).toEqual(['ColA', 'ColB', 'Name', 'Pad', 'Status']);
      expect((after.schema[statusId].options as { value: string }[]).map((o) => o.value).sort()).toEqual(['Alpha', 'Beta', 'Open']);
      expect((r.body as any).newProperties.sort()).toEqual(['ColA', 'Pad']);
      expect((r.body as any).added).toBe(1);
    } finally {
      await otherDone?.catch(() => {});
      await other.end();
    }
  }, 60_000);
});
