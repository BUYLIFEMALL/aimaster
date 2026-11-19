// 4MiB를 넘어 Storage로 올라간 파일의 가져오기 — WS-20261119-02(Master msg_b6590eaaaee8).
// 예전: 그런 파일은 내용이 DB에 없어 가져오기가 "Upload not found"(404)로 끝났다(재현 c2816bf0f).
// 지금: 가져오기 세 명령(importFiles·previewCsv·mergeCsv)이 권한·횟수 확인 뒤 가져오기 전용 로더로 하나씩 읽는다.
// 가짜 Storage·가짜 내려받기로 확인한다(실제 업로드·실제 네트워크 없음). 로컬 Postgres 전용 fixture만 쓴다.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let fs_: typeof import('../../src/server/fileStorage.ts');
let db: typeof import('../../src/litpage/server/db.ts');
let files: typeof import('../../src/litpage/server/content/files.ts');
let zip: typeof import('../../src/litpage/server/content/zip.ts');
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
/** 내려받기 동작을 바꿔 끼우는 손잡이 */
const net: { status: number; extra: number; lieLength: number | null; delayMs: number } = { status: 200, extra: 0, lieLength: null, delayMs: 0 };

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
  Object.assign(net, { status: 200, extra: 0, lieLength: null, delayMs: 0 });
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
