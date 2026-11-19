// 큰 ZIP(50MiB 초과) 가져오기 — WS-20261119-02, 플랜 docs/PLAN_20261119_LARGE_ZIP_IMPORT.md §9~§12.
// 브라우저용 코드(web/features/import/zipReader.ts·largeZipImport.ts)를 그대로 불러 서버 함수에 연결해 확인한다.
// · 통째로 올린 것과 결과가 같다(§12-6)  · 「이 작업에서 이 회원이 올린 그림」만 쓰이고 지워진다(§9·§10)  · 한도(§11)
// 가짜 Storage(실제 업로드 없음), 로컬 Postgres 전용 fixture만 쓴다.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { setupLocalDb } from '../setup-local-db.mjs';
import { ZIP_IMPORT_LIMITS } from '../../src/litpage/shared/zipPath.ts';
import { ZipReadError, buildStoredZip, planLargeZip, readZipEntry, readZipIndex } from '../../src/litpage/web/features/import/zipReader.ts';
import { isLargeZip, prepareLargeZip, settleLargeZip, type LargeZipDeps } from '../../src/litpage/web/features/import/largeZipImport.ts';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let fs_: typeof import('../../src/server/fileStorage.ts');
let db: typeof import('../../src/litpage/server/db.ts');
let files: typeof import('../../src/litpage/server/content/files.ts');
let zip: typeof import('../../src/litpage/server/content/zip.ts');
let ratelimit: typeof import('../../src/litpage/server/ratelimit.ts');
const ann = { id: 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1', email: 'lz-ann@example.com', name: '앤' };
const bob = { id: 'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2', email: 'lz-bob@example.com', name: '밥' };
type M = typeof ann;
const MB = 1024 * 1024;
const spaces = new Map<string, string>();
const sp = (m: M) => spaces.get(m.id)!;

const objects = new Map<string, Buffer>();
const removedPaths: string[] = [];
const sw: { quotaFull: boolean; removeFails: boolean; listFails: boolean; putFails: boolean; onRemove: null | ((paths: string[]) => Promise<void>) } = { quotaFull: false, removeFails: false, listFails: false, putFails: false, onRemove: null };
const fakeStore = () => ({
  getBucket: async () => ({ data: { id: 'workspace-files' }, error: null }),
  createBucket: async () => ({ data: null, error: null }),
  from: () => ({
    createSignedUploadUrl: async (path: string) => ({ data: { signedUrl: `https://store.test/upload/${path}`, token: 't', path }, error: null }),
    list: async (dir: string, o: { search: string }) => (sw.listFails
      ? { data: null, error: { message: 'storage down' } }
      : { data: [...objects.entries()].filter(([p]) => p === `${dir}/${o.search}`).map(([p, b]) => ({ name: p.split('/').pop(), metadata: { size: b.length } })), error: null }),
    createSignedUrl: async (path: string) => ({ data: { signedUrl: `https://store.test/get/${path}` }, error: null }),
    remove: async (paths: string[]) => {
      // Storage 삭제를 기다리는 사이에 끼워 넣을 일(한 번만)
      if (sw.onRemove) {
        const run = sw.onRemove;
        sw.onRemove = null;
        await run(paths);
      }
      if (sw.removeFails) return { data: null, error: { message: 'storage down' } };
      // 실제 Storage처럼: 있던 것만 「지웠다」고 답한다(없던 경로는 답에 없다)
      const had = paths.filter((p) => objects.has(p));
      for (const p of had) objects.delete(p);
      removedPaths.push(...had);
      return { data: had.map((name) => ({ name })), error: null };
    },
  }),
});

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  fs_ = await import('../../src/server/fileStorage.ts');
  db = await import('../../src/litpage/server/db.ts');
  files = await import('../../src/litpage/server/content/files.ts');
  zip = await import('../../src/litpage/server/content/zip.ts');
  ratelimit = await import('../../src/litpage/server/ratelimit.ts');
  fs_.setFileStorageForTests({
    store: fakeStore as never,
    quota: async () => ({ allowed: !sw.quotaFull, message: sw.quotaFull ? '저장공간이 가득 찼습니다.' : null, upgradeUrl: 'https://www.buylife.xyz/storage' }),
    // 글 묶음은 Storage에 있으므로 가져오기가 전용 로더로 읽는다
    fetch: async (url: string) => {
      const b = objects.get(url.replace('https://store.test/get/', ''));
      return b ? new Response(new Uint8Array(b), { status: 200, headers: { 'content-length': String(b.length) } }) : new Response('nope', { status: 404 });
    },
  });
  for (const m of [ann, bob]) {
    await runtime.runRpc('loadAccountData', {}, m);
    const r = await runtime.runRpc('createWorkspace', { name: `${m.name} 큰 ZIP 시험` }, m);
    spaces.set(m.id, (r.body as any).spaceId ?? (r.body as any).space?.id ?? (r.body as any).id);
    expect(sp(m)).toBeTruthy();
  }
});

beforeEach(() => {
  Object.assign(sw, { quotaFull: false, removeFails: false, listFails: false, putFails: false, onRemove: null });
  removedPaths.length = 0;
  for (const m of [ann, bob]) for (const k of [`import-job:user:${m.id}`, `import:${m.id}`, `import-stored:${m.id}`, `upload-large:user:${m.id}`]) ratelimit.reset(k);
});

// ---------------------------------------------------------------- 도우미
const PNG = (n = 0) => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, n]);
const H1 = '0123456789abcdef0123456789abcdef';
const H2 = 'fedcba9876543210fedcba9876543210';
const enc = (s: string) => encodeURIComponent(s);
const html = (title: string, body: string) => `<html><head><meta charset="utf-8"><title>${title}</title></head><body><article><header><h1 class="page-title">${title}</h1></header><div class="page-body">${body}</div></article></body></html>`;
type E = { name: string; data: Buffer | string };

const notionExport = (): E[] => [
  { name: `Project ${H1}.html`, data: html('Project', `<p>본문</p><figure class="image"><img src="${enc(`Project ${H1}`)}/cover.png"/></figure><p><a href="${enc(`Project ${H1}`)}/${enc(`Sub ${H2}`)}.html">하위 문서</a></p>`) },
  { name: `Project ${H1}/cover.png`, data: PNG(1) },
  { name: `Project ${H1}/unused.png`, data: PNG(2) },
  { name: `Project ${H1}/Sub ${H2}.html`, data: html('Sub', `<h2>소제목</h2><figure class="image"><img src="${enc(`Sub ${H2}`)}/deep.png"/></figure>`) },
  { name: `Project ${H1}/Sub ${H2}/deep.png`, data: PNG(3) },
  { name: `Project ${H1}/video.mp4`, data: Buffer.from('not really a video') },
];
const markdownCsv = (): E[] => [
  { name: 'Notes.md', data: '# Notes\n\n첫 문단 ![그림](img/a.png)\n\n[표](Tasks.csv)\n' },
  { name: 'img/a.png', data: PNG(4) },
  { name: 'Tasks.csv', data: 'Name,Status\nAlpha,Done\nBeta,Todo\n' },
  { name: `Tasks/Alpha ${H1}.md`, data: '# Alpha\n\n알파 본문 ![x](../img/a.png)\n' },
];
const korean = (): E[] => [
  { name: `회의록 ${H1}.html`, data: html('회의록', `<p>안건</p><figure class="image"><img src="${enc(`회의록 ${H1}`)}/${enc('화면 캡처.png')}"/></figure>`) },
  { name: `회의록 ${H1}/화면 캡처.png`, data: PNG(5) },
];
const messy = (): E[] => [
  { name: 'Top/.hidden.md', data: '# Hidden\n' },
  { name: '__MACOSX/Top/._Page.md', data: 'junk' },
  { name: 'Top/.DS_Store', data: 'junk' },
  { name: 'Top/Page.md', data: '# Page\n\n본문 ![x](assets/a.png) [문서](Folder/Inner.md)\n' },
  { name: 'Top/assets/a.png', data: PNG(6) },
  { name: 'Top/Folder/Inner.md', data: '# Inner\n\n안쪽 ![y](../assets/a.png)\n' },
  { name: 'Top/Folder/Second.txt', data: '첫 줄\n\n다음 문단\n' },
  { name: 'Top\\Back\\Slash.md', data: '# Slash\n' },
];

/** 결과 recordMap → id·시각 없는 트리(importZipBaseline.test.ts와 같은 방식) */
function treeOf(body: any) {
  const table = (t: string) => Object.fromEntries(Object.entries(body.recordMap?.[t] ?? {}).map(([id, v]: [string, any]) => [id, v?.value?.value ?? v?.value ?? v]));
  const blocks = table('block') as Record<string, any>;
  const cols = table('collection') as Record<string, any>;
  const scrub = (v: unknown) => v === undefined ? undefined : JSON.parse(JSON.stringify(v)
    .replace(/\/files\/[0-9a-f-]{36}\//g, '/files/*/')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<id>')
    .replace(/\/[0-9a-f]{32}\b/g, '/<page>'));
  const images: string[] = [];
  const node = (id: string): unknown => {
    const b = blocks[id];
    if (!b) return { missing: true };
    const props = scrub(b.properties);
    const src = JSON.stringify(props ?? {}).match(/\/files\/\*\/[^"\\]+/g);
    if (src) images.push(...src);
    const out: Record<string, unknown> = { type: b.type };
    if (props) out.properties = props;
    if (b.format && Object.keys(b.format).length) out.format = scrub(b.format);
    if (b.collection_id) {
      const c = cols[b.collection_id];
      const rows = Object.values(blocks).filter((r: any) => r.parent_table === 'collection' && r.parent_id === b.collection_id);
      out.collection = {
        name: scrub(c?.name),
        schema: Object.values(c?.schema ?? {}).map((p: any) => `${p.name}:${p.type}`).sort(),
        rows: rows.map((r: any) => ({ title: (r.properties?.title ?? []).map((d: any) => d[0]).join(''), children: (r.content ?? []).map(node) })).sort((a, z) => a.title.localeCompare(z.title)),
      };
    }
    if (b.content?.length) out.children = b.content.map(node);
    return out;
  };
  return { pages: body.pages, databases: body.databases, roots: (body.pageIds as string[]).map(node), images: images.sort() };
}

const q = <T = any>(sql: string, ...p: unknown[]) => db.withRequestCache(() => db.db.prepare(sql).all(...p) as T[]);
const blockCount = (m: M) => Number(q<{ n: number }>("SELECT COUNT(*) AS n FROM records WHERE tbl = 'block' AND space_id = ?", sp(m))[0].n);
const jobRow = (id: string) => q<any>('SELECT * FROM import_jobs WHERE id = ?', id)[0];
/** 작업의 모든 파일(글 묶음 포함) */
const jobAll = (id: string) => q<{ id: string; name: string; pending: number; storage_path: string }>('SELECT id, name, pending, storage_path FROM files WHERE import_job_id = ? ORDER BY name', id);
/** 작업의 그림 파일(글 묶음 ZIP 제외) */
const jobFiles = (id: string) => jobAll(id).filter((f) => !/\.zip$/i.test(f.name));
const removedImages = () => removedPaths.filter((p) => !/\.zip$/i.test(p));
const step = (m: M, body: Record<string, unknown>) => fs_.importJobStep(m, body);
const storePages = (m: M, name: string, entries: E[]) => db.withRequestCache(() => files.storeFile(name, zip.writeZip(entries), m.id, sp(m), 'application/zip'));

function depsFor(m: M): LargeZipDeps {
  return {
    async job(body) {
      const r = await step(m, body);
      if (r.status !== 200) throw Object.assign(new Error(String(r.body.message)), { status: r.status, data: r.body });
      return r.body;
    },
    async put(uploadUrl, data, type) {
      if (sw.putFails && type !== 'application/zip') return false; // 그림 올리기만 실패시킨다
      objects.set(uploadUrl.replace('https://store.test/upload/', ''), Buffer.from(await data.arrayBuffer()));
      return true;
    },
    async uploadPages(pages, name) {
      const buf = Buffer.from(await pages.arrayBuffer());
      return db.withRequestCache(() => files.storeFile(name, buf, m.id, sp(m), 'application/zip'));
    },
  };
}

/** 통째로 올리는 예전 경로 */
async function viaWhole(m: M, entries: E[]) {
  const up = storePages(m, 'sample.zip', entries);
  return runtime.runRpc('importFiles', { spaceId: sp(m), parent: { kind: 'private' }, files: [{ name: 'sample.zip', url: up.url }] }, m);
}
/** 큰 ZIP 경로(브라우저 코드 그대로) */
async function viaLarge(m: M, zipBytes: Buffer | Blob, name = 'sample.zip') {
  const blob = zipBytes instanceof Blob ? zipBytes : new Blob([new Uint8Array(zipBytes)]);
  const prep = await prepareLargeZip(blob, name, sp(m), depsFor(m));
  const r = await runtime.runRpc('importFiles', { spaceId: sp(m), parent: { kind: 'private' }, files: [{ name: prep.name, url: prep.url, job: prep.job }] }, m);
  if (prep.job) await settleLargeZip(prep.job.id, depsFor(m), r.status === 200 ? undefined : Object.assign(new Error('rejected'), { status: r.status }));
  return { r, prep };
}
/** 단계별로 직접: 작업을 열고 그림을 올려 파일 id를 얻는다 */
const DEFAULT_PAGES: E[] = [{ name: 'P.md', data: '# P\n\n![a](a.png)\n' }];
/** 글 묶음을 그 작업의 「글 묶음」으로 올리고 파일 id를 돌려준다 */
async function jobPages(m: M, jobId: string, entries: E[], opts: { finish?: boolean } = {}) {
  const data = zip.writeZip(entries);
  const r = await step(m, { step: 'import-pages', jobId, name: 'p.zip', size: data.length });
  expect(r.status).toBe(200);
  objects.set(String(r.body.uploadUrl).replace('https://store.test/upload/', ''), data);
  if (opts.finish !== false) expect((await step(m, { step: 'import-done', jobId, ids: [r.body.id] })).body.failed).toEqual([]);
  return String(r.body.id);
}
async function rawJob(m: M, images: { name: string; data: Buffer }[], opts: { finish?: boolean; pages?: E[] | null } = {}) {
  const pageEntries = opts.pages === undefined ? DEFAULT_PAGES : opts.pages;
  const b = await step(m, { step: 'import-begin', spaceId: sp(m), files: images.length + 1, bytes: images.reduce((a, i) => a + i.data.length, 0) + (pageEntries ? zip.writeZip(pageEntries).length : 4096) });
  expect(b.status).toBe(200);
  const jobId = String(b.body.jobId);
  const s = await step(m, { step: 'import-sign', jobId, items: images.map((i) => ({ name: i.name, type: 'image/png', size: i.data.length })) });
  expect(s.status).toBe(200);
  const items = s.body.items as { id: string; uploadUrl: string }[];
  items.forEach((it, k) => objects.set(it.uploadUrl.replace('https://store.test/upload/', ''), images[k].data));
  if (opts.finish !== false) expect((await step(m, { step: 'import-done', jobId, ids: items.map((i) => i.id) })).body.failed).toEqual([]);
  const pages = pageEntries ? await jobPages(m, jobId, pageEntries) : '';
  return { jobId, ids: items.map((i) => i.id), pages };
}
const importWith = (m: M, url: string, job: unknown, extra: { name: string; url: string }[] = []) =>
  runtime.runRpc('importFiles', { spaceId: sp(m), parent: { kind: 'private' }, files: [{ name: 'p.zip', url, job }, ...extra] }, m);
const brief = (r: { status: number; body: unknown }) => ({ status: r.status, message: (r.body as any)?.message });

// ---------------------------------------------------------------- 시험
describe('통째로 올린 것과 결과가 같다(§12-6)', () => {
  const cases: [string, () => E[]][] = [['노션 페이지 내보내기', notionExport], ['Markdown + CSV', markdownCsv], ['한글 파일명', korean], ['숨김 파일·공통 폴더·역슬래시', messy]];
  for (const [label, make] of cases) {
    it(label, async () => {
      const whole = await viaWhole(ann, make());
      const { r, prep } = await viaLarge(ann, zip.writeZip(make()));
      expect(whole.status).toBe(200);
      expect(r.status).toBe(200);
      expect(prep.job).toBeTruthy();
      expect(treeOf(r.body)).toEqual(treeOf(whole.body));
    });
  }

  it('Export-….zip이 한 번 겹친 ZIP(압축된 안쪽·압축 없는 안쪽 모두)', async () => {
    const inner = zip.writeZip(notionExport());
    const whole = await viaWhole(ann, notionExport());
    const deflated = await viaLarge(ann, zip.writeZip([{ name: 'Export-1.zip', data: inner }]));
    const stored = await viaLarge(ann, buildStoredZip([{ name: 'Export-1.zip', data: new Uint8Array(inner) }]));
    expect(treeOf(deflated.r.body)).toEqual(treeOf(whole.body));
    expect(treeOf(stored.r.body)).toEqual(treeOf(whole.body));
  });

  it('그림이 없는 ZIP은 작업을 열지 않고 예전처럼 가져온다', async () => {
    const jobsBefore = q('SELECT id FROM import_jobs').length;
    const { r, prep } = await viaLarge(ann, zip.writeZip([{ name: 'Only.md', data: '# Only\n\n글만\n' }, { name: 'clip.mp4', data: 'x' }]));
    expect(r.status).toBe(200);
    expect(prep.job).toBeUndefined();
    expect(q('SELECT id FROM import_jobs').length).toBe(jobsBefore);
  });

  it('알려 둔 차이: 같은 이름이 둘이면 큰 ZIP 경로는 첫 항목을 쓰고 건너뛴 목록에 적는다(통째 경로는 뒤 항목)', async () => {
    const dup: E[] = [{ name: 'Dup.md', data: '# First\n' }, { name: 'Dup.md', data: '# Second\n' }, { name: 'a.png', data: PNG(7) }, { name: 'Use.md', data: '# Use\n\n![a](a.png)\n' }];
    const whole = await viaWhole(ann, dup);
    const { r, prep } = await viaLarge(ann, zip.writeZip(dup));
    const titles = (b: any) => (b.pageIds as string[]).map((id) => (b.recordMap.block[id].value.value.properties?.title ?? []).map((d: any) => d[0]).join('')).sort();
    expect(titles(whole.body)).toEqual(['Second', 'Use']);
    expect(titles(r.body)).toEqual(['First', 'Use']);
    expect(prep.skipped).toContainEqual({ name: 'Dup.md', reason: 'duplicate' });
  });
});

describe('작업 단위: 올린 것·쓰인 것·지워지는 것(§9·§10)', () => {
  it('그림은 Storage에 작업 표시와 함께 올라가고, 본문에 쓰인 것만 남는다. 동영상은 올리지 않는다', async () => {
    const { r, prep } = await viaLarge(ann, zip.writeZip(notionExport()));
    expect(r.status).toBe(200);
    const job = jobRow(prep.job!.id);
    expect(job).toMatchObject({ user_id: ann.id, space_id: sp(ann), state: 'closed' });
    expect(Number(job.declared_files)).toBe(4); // 그림 cover·unused·deep + 글 묶음 1 (video.mp4 제외)
    // 마무리 뒤: 쓰인 두 장만 남고 unused.png는 줄과 Storage 모두에서 지워졌다
    const left = jobFiles(prep.job!.id);
    expect(left.map((f) => f.name)).toEqual(['cover.png', 'deep.png']);
    expect(left.every((f) => Number(f.pending) === 0 && f.storage_path.startsWith(`${ann.id}/${f.id}/`))).toBe(true);
    expect(removedImages()).toHaveLength(1);
    expect(removedImages()[0]).toContain('unused.png');
    expect(removedPaths.filter((p) => /\.zip$/i.test(p))).toHaveLength(1); // 다 쓴 글 묶음도 지운다
    expect(jobAll(prep.job!.id)).toHaveLength(2);
    expect([...objects.keys()].some((p) => p.includes('video.mp4'))).toBe(false);
    expect(left.every((f) => objects.has(f.storage_path))).toBe(true);
    // 본문의 그림 주소는 남은 파일을 가리킨다
    const urls = JSON.stringify(r.body).match(/\/files\/[0-9a-f-]{36}\//g) ?? [];
    expect(new Set(urls.map((u) => u.slice(7, 43)))).toEqual(new Set(left.map((f) => f.id)));
  });

  it('끝난 작업으로 다시 부르면 새로 만들지 않고 처음 결과를 돌려준다', async () => {
    const blob = new Blob([new Uint8Array(zip.writeZip(korean()))]);
    const prep = await prepareLargeZip(blob, 'again.zip', sp(ann), depsFor(ann));
    const first = await importWith(ann, prep.url, prep.job);
    expect(first.status).toBe(200);
    const n = blockCount(ann);
    const second = await importWith(ann, prep.url, prep.job);
    expect(second.status).toBe(200);
    expect((second.body as any).repeated).toBe(true);
    expect((second.body as any).pageIds).toEqual((first.body as any).pageIds);
    expect(blockCount(ann)).toBe(n);
    await settleLargeZip(prep.job!.id, depsFor(ann));
    const third = await importWith(ann, prep.url, prep.job); // 마무리(closed) 뒤에도 같다
    expect((third.body as any).repeated).toBe(true);
    expect(blockCount(ann)).toBe(n);
  });

  it('응답을 받지 못했을 때: 이미 끝났으면 그 결과를 쓰고, 아니면 아무것도 지우지 않는다', async () => {
    const blob = new Blob([new Uint8Array(zip.writeZip(korean()))]);
    const done = await prepareLargeZip(blob, 'lost.zip', sp(ann), depsFor(ann));
    const r = await importWith(ann, done.url, done.job);
    const got = await settleLargeZip(done.job!.id, depsFor(ann), new TypeError('Failed to fetch'));
    expect(got).toEqual({ pageIds: (r.body as any).pageIds, pages: 1, databases: 0 });
    const open = await prepareLargeZip(blob, 'lost2.zip', sp(ann), depsFor(ann));
    expect(await settleLargeZip(open.job!.id, depsFor(ann), new TypeError('Failed to fetch'))).toBeNull();
    expect(jobRow(open.job!.id).state).toBe('open');
    expect(jobFiles(open.job!.id)).toHaveLength(1);
    // 서버가 분명히 거절한 경우에는 이 작업의 파일을 지운다
    await settleLargeZip(open.job!.id, depsFor(ann), Object.assign(new Error('bad'), { status: 400 }));
    expect(jobRow(open.job!.id).state).toBe('cancelled');
    expect(jobFiles(open.job!.id)).toHaveLength(0);
  });
});

describe('「ZIP 안 경로 → 파일 id」 표 검증(§9) — 하나라도 어긋나면 페이지를 만들지 않는다', () => {
  const pages: E[] = [{ name: 'P.md', data: '# P\n\n![a](a.png)\n' }];
  const expectRejected = async (run: () => Promise<{ status: number; body: unknown }>, status: number) => {
    const n = blockCount(ann);
    const r = await run();
    expect(r.status).toBe(status);
    expect(blockCount(ann)).toBe(n);
    return r;
  };

  it('다른 회원이 올린 파일·다른 작업의 파일·작업 밖 파일·끝내지 않은 파일은 쓸 수 없다', async () => {
    const mine = await rawJob(ann, [{ name: 'a.png', data: PNG(10) }]);
    const url = mine.pages;
    // 다른 회원의 작업 파일
    const theirs = await rawJob(bob, [{ name: 'a.png', data: PNG(11) }]);
    await expectRejected(() => importWith(ann, url, { id: mine.jobId, assets: { 'a.png': theirs.ids[0] } }), 400);
    // 작업 밖에서 올린 내 Storage 파일
    const signed = await fs_.signLargeUpload(ann, { name: 'big.png', type: 'image/png', size: 5 * MB, spaceId: sp(ann) });
    objects.set(String(signed.body.uploadUrl).replace('https://store.test/upload/', ''), Buffer.alloc(5 * MB, 1));
    await fs_.finishLargeUpload(ann, { id: signed.body.id });
    await expectRejected(() => importWith(ann, url, { id: mine.jobId, assets: { 'a.png': String(signed.body.id) } }), 400);
    // DB에 든 내 작은 파일
    const small = db.withRequestCache(() => files.storeFile('s.png', PNG(12), ann.id, sp(ann), 'image/png'));
    await expectRejected(() => importWith(ann, url, { id: mine.jobId, assets: { 'a.png': small.id } }), 400);
    // 주소(URL)는 받지 않는다 — 파일 id만
    await expectRejected(() => importWith(ann, url, { id: mine.jobId, assets: { 'a.png': `/files/${mine.ids[0]}/a.png` } }), 400);
    // 같은 회원의 **다른 작업** 파일: 앞 작업을 끝낸 뒤(그 그림은 본문에 쓰여 남아 있다) 새 작업에서 그 파일 id를 쓰려 한다
    expect((await importWith(ann, url, { id: mine.jobId, assets: { 'a.png': mine.ids[0] } })).status).toBe(200);
    await step(ann, { step: 'import-finish', jobId: mine.jobId });
    expect(jobFiles(mine.jobId)).toHaveLength(1);
    const other = await rawJob(ann, [{ name: 'a.png', data: PNG(13) }], { finish: false });
    await expectRejected(() => importWith(ann, other.pages, { id: other.jobId, assets: { 'a.png': mine.ids[0] } }), 400);
    // 끝내지 않은(대기) 파일
    await expectRejected(() => importWith(ann, other.pages, { id: other.jobId, assets: { 'a.png': other.ids[0] } }), 400);
    // 취소된 작업
    await step(ann, { step: 'import-cancel', jobId: other.jobId });
    expect(brief(await expectRejected(() => importWith(ann, other.pages, { id: other.jobId, assets: {} }), 409)).message).toContain('취소된');
    expect(jobFiles(mine.jobId)).toHaveLength(1); // 앞 작업의 쓰인 그림은 그대로
    await step(bob, { step: 'import-cancel', jobId: theirs.jobId });
  });

  it('남의 작업·다른 워크스페이스의 작업·없는 작업은 똑같이 404', async () => {
    const theirs = await rawJob(bob, [{ name: 'a.png', data: PNG(14) }]);
    const url = storePages(ann, 'p.zip', pages).url;
    for (const id of [theirs.jobId, '00000000-0000-4000-8000-000000000000', 'not-a-uuid']) {
      expect(brief(await expectRejected(() => importWith(ann, url, { id, assets: {} }), 404))).toMatchObject({ message: 'Import job not found' });
    }
    // 단계 호출도 남의 작업은 찾지 못한다
    for (const s of ['import-sign', 'import-done', 'import-finish', 'import-cancel', 'import-status']) expect((await step(ann, { step: s, jobId: theirs.jobId, items: [{ name: 'x.png', size: 1 }], ids: theirs.ids })).status).toBe(404);
    expect(jobFiles(theirs.jobId)).toHaveLength(1);
    await step(bob, { step: 'import-cancel', jobId: theirs.jobId });
  });

  it('경로: 정규화 뒤 중복·같은 파일 두 번·그림이 아닌 경로·숨김·글 묶음과 겹침·개수 초과를 거절한다', async () => {
    const j = await rawJob(ann, [{ name: 'a.png', data: PNG(15) }, { name: 'b.png', data: PNG(16) }], { pages: [...pages, { name: 'taken.png', data: PNG(17) }] });
    const url = j.pages;
    const bad: Record<string, string>[] = [
      { 'a.png': j.ids[0], './a.png': j.ids[1] }, // 정규화하면 같은 경로
      { 'x\\a.png': j.ids[0], 'x/a.png': j.ids[1] },
      { 'a.png': j.ids[0], 'b.png': j.ids[0] }, // 같은 파일 두 번
      { 'notes.md': j.ids[0] }, // 그림이 아님
      { 'clip.mp4': j.ids[0] },
      { '.secret/a.png': j.ids[0] }, // 숨김
      { '__MACOSX/a.png': j.ids[0] },
      { 'dir/': j.ids[0] },
      { [`${'d/'.repeat(40)}a.png`]: j.ids[0] }, // 너무 깊음
      { 'taken.png': j.ids[0] }, // 글 묶음 안의 항목과 같은 이름
      { 'a.png': j.ids[0], 'b.png': j.ids[1], 'c.png': '11111111-1111-4111-8111-111111111111' }, // 올린 것보다 많음
    ];
    for (const assets of bad) await expectRejected(() => importWith(ann, url, { id: j.jobId, assets }), 400);
    // 큰 ZIP은 다른 파일과 함께 넣을 수 없고, ZIP이 아닌 파일에 작업을 붙일 수 없다
    const md = db.withRequestCache(() => files.storeFile('x.md', '# x\n', ann.id, sp(ann), 'text/markdown'));
    await expectRejected(() => importWith(ann, url, { id: j.jobId, assets: { 'a.png': j.ids[0] } }, [{ name: 'x.md', url: md.url }]), 400);
    await expectRejected(() => runtime.runRpc('importFiles', { spaceId: sp(ann), parent: { kind: 'private' }, files: [{ name: 'x.md', url: md.url, job: { id: j.jobId, assets: {} } }] }, ann), 400);
    // 거절 뒤에도 작업은 열려 있고(다시 시도 가능) 바르게 보내면 된다
    expect(jobRow(j.jobId).state).toBe('open');
    const ok = await importWith(ann, url, { id: j.jobId, assets: { 'a.png': j.ids[0], 'b.png': j.ids[1] } });
    expect(ok.status).toBe(200);
    expect((await step(ann, { step: 'import-finish', jobId: j.jobId })).body.removed).toBe(2); // 쓰이지 않은 b.png + 다 쓴 글 묶음
    expect(jobAll(j.jobId).map((f) => f.name)).toEqual(['a.png']);
  });
});

describe('정리 범위(§10) — 그 작업이 올린 것만', () => {
  it('취소는 그 작업의 파일만 지운다(같은 회원의 다른 파일·다른 회원 파일은 그대로)', async () => {
    const keepSmall = db.withRequestCache(() => files.storeFile('keep.png', PNG(20), ann.id, sp(ann), 'image/png'));
    const signed = await fs_.signLargeUpload(ann, { name: 'keep-big.bin', type: 'application/octet-stream', size: 5 * MB, spaceId: sp(ann) });
    const bigPath = String(signed.body.uploadUrl).replace('https://store.test/upload/', '');
    objects.set(bigPath, Buffer.alloc(5 * MB, 2));
    await fs_.finishLargeUpload(ann, { id: signed.body.id });
    const theirs = await rawJob(bob, [{ name: 'bob.png', data: PNG(21) }]);
    const mine = await rawJob(ann, [{ name: 'one.png', data: PNG(22) }, { name: 'two.png', data: PNG(23) }]);
    const paths = jobAll(mine.jobId).map((f) => f.storage_path); // 그림 2 + 글 묶음 1
    const c = await step(ann, { step: 'import-cancel', jobId: mine.jobId });
    expect(c.body.removed).toBe(3);
    expect([...removedPaths].sort()).toEqual([...paths].sort());
    expect(jobAll(mine.jobId)).toHaveLength(0);
    expect(q('SELECT id FROM files WHERE id IN (?, ?)', keepSmall.id, String(signed.body.id))).toHaveLength(2);
    expect(objects.has(bigPath)).toBe(true);
    expect(jobFiles(theirs.jobId)).toHaveLength(1);
    // 다시 취소해도 달라지지 않는다(이미 취소됨 — 남은 것이 없으면 0)
    expect(await step(ann, { step: 'import-cancel', jobId: mine.jobId })).toMatchObject({ status: 200, body: { removed: 0 } });
    expect(removedPaths).toHaveLength(3);
    await step(bob, { step: 'import-cancel', jobId: theirs.jobId });
  });

  it('취소 뒤 Storage 삭제가 실패하면 파일 줄을 남겨 두고, 다음 정리(또는 다시 취소)가 지운다', async () => {
    const j = await rawJob(ann, [{ name: 'stuck.png', data: PNG(24) }, { name: 'stuck2.png', data: PNG(27) }]);
    sw.removeFails = true;
    expect((await step(ann, { step: 'import-cancel', jobId: j.jobId })).body.removed).toBe(0);
    expect(jobRow(j.jobId).state).toBe('cancelled');
    expect(jobFiles(j.jobId)).toHaveLength(2); // 줄만 사라지고 Storage에 남는 일이 없다
    expect(await fs_.cleanupStaleImportJobs()).toBe(0); // 여전히 실패하면 그대로 남는다
    expect(jobFiles(j.jobId)).toHaveLength(2);
    sw.removeFails = false;
    // 정리 작업이 취소된 작업의 남은 파일을 다시 지운다(작업이 오래됐는지와 무관)
    expect(await fs_.cleanupStaleImportJobs()).toBe(3); // 그림 2 + 글 묶음
    expect(jobAll(j.jobId)).toHaveLength(0);
    expect(jobRow(j.jobId).state).toBe('cancelled');
  });

  it('마무리에서 Storage 삭제가 실패하면 끝남(done)으로 남겨 두고, 다시 마무리하면 지우고 닫는다. 쓰인 그림은 항상 남는다', async () => {
    const prep = await prepareLargeZip(new Blob([new Uint8Array(zip.writeZip(notionExport()))]), 'retry.zip', sp(ann), depsFor(ann));
    expect((await importWith(ann, prep.url, prep.job)).status).toBe(200);
    sw.removeFails = true;
    expect((await step(ann, { step: 'import-finish', jobId: prep.job!.id })).body.removed).toBe(0);
    expect(jobRow(prep.job!.id).state).toBe('done');
    expect(jobFiles(prep.job!.id)).toHaveLength(3);
    sw.removeFails = false;
    expect((await step(ann, { step: 'import-finish', jobId: prep.job!.id })).body.removed).toBe(2); // unused.png + 글 묶음
    expect(jobRow(prep.job!.id).state).toBe('closed');
    expect(jobFiles(prep.job!.id).map((f) => f.name)).toEqual(['cover.png', 'deep.png']);
    expect((await step(ann, { step: 'import-finish', jobId: prep.job!.id })).body.removed).toBe(0);
  });

  it('하루 넘은 작업: 열린 것은 전부, 끝났지만 마무리 안 된 것은 쓰이지 않은 것만 지운다. 새 작업은 건드리지 않는다', async () => {
    const blob = new Blob([new Uint8Array(zip.writeZip(notionExport()))]);
    const doneJob = await prepareLargeZip(blob, 'old-done.zip', sp(ann), depsFor(ann));
    expect((await importWith(ann, doneJob.url, doneJob.job)).status).toBe(200); // 마무리(import-finish)는 부르지 않음
    const fresh = await rawJob(bob, [{ name: 'fresh.png', data: PNG(25) }]);
    const oldOpen = await rawJob(ann, [{ name: 'old.png', data: PNG(26) }]);
    const old = Date.now() - 25 * 3_600_000;
    db.withRequestCache(() => db.db.prepare('UPDATE import_jobs SET created_time = ? WHERE id IN (?, ?)').run(old, doneJob.job!.id, oldOpen.jobId));
    // 만료된 열린 작업은 단계 호출·가져오기 모두 거절
    expect((await step(ann, { step: 'import-sign', jobId: oldOpen.jobId, items: [{ name: 'x.png', size: 1 }] })).status).toBe(410);
    expect((await importWith(ann, oldOpen.pages, { id: oldOpen.jobId, assets: {} })).status).toBe(410);
    expect(await fs_.cleanupStaleImportJobs()).toBe(4); // 열린 작업의 old.png·글 묶음 + 끝난 작업의 unused.png·글 묶음
    expect(jobRow(oldOpen.jobId).state).toBe('cancelled');
    expect(jobAll(oldOpen.jobId)).toHaveLength(0);
    expect(jobRow(doneJob.job!.id).state).toBe('closed');
    expect(jobFiles(doneJob.job!.id).map((f) => f.name)).toEqual(['cover.png', 'deep.png']);
    expect(jobRow(fresh.jobId).state).toBe('open');
    expect(jobFiles(fresh.jobId)).toHaveLength(1);
    await step(bob, { step: 'import-cancel', jobId: fresh.jobId });
  });

  it('올리는 도중 실패하면 준비 단계가 그 작업을 취소·정리한다', async () => {
    const before = q('SELECT id FROM files WHERE user_id = ?', ann.id).length;
    const base = depsFor(ann);
    // 그림은 올라갔지만 마지막의 글 묶음 올리기가 실패한다
    const failing: LargeZipDeps = { ...base, put: (u, d, type) => (type === 'application/zip' ? Promise.resolve(false) : base.put(u, d, type)) };
    await expect(prepareLargeZip(new Blob([new Uint8Array(zip.writeZip(korean()))]), 'fail.zip', sp(ann), failing)).rejects.toThrow('Couldn’t upload the pages of this ZIP');
    const last = q<any>('SELECT id, state FROM import_jobs WHERE user_id = ? ORDER BY created_time DESC LIMIT 1', ann.id)[0];
    expect(last.state).toBe('cancelled');
    expect(jobAll(last.id)).toHaveLength(0);
    expect(q('SELECT id FROM files WHERE user_id = ?', ann.id).length).toBe(before);
  });
});

// 2026-11-19 Master msg_2e22cd4b41c3: 상태 전환에 성공했을 때만 지운다 — 시작·취소·만료·완료가 겹쳐도 쓰인 그림은 남는다
describe('시작·취소·만료·완료의 경합', () => {
  const pages: E[] = [{ name: 'P.md', data: '# P\n\n![a](a.png)\n' }];
  const usedImageIntact = (jobId: string, id: string) => {
    const left = jobFiles(jobId);
    expect(left.map((f) => f.id)).toEqual([id]);
    expect(objects.has(left[0].storage_path)).toBe(true);
  };

  it('가져오기가 먼저 끝난 작업은 취소할 수 없고 쓰인 그림이 남는다', async () => {
    const j = await rawJob(ann, [{ name: 'a.png', data: PNG(60) }]);
    expect((await importWith(ann, j.pages, { id: j.jobId, assets: { 'a.png': j.ids[0] } })).status).toBe(200);
    expect(brief(await step(ann, { step: 'import-cancel', jobId: j.jobId }))).toMatchObject({ status: 409 });
    expect(jobRow(j.jobId).state).toBe('done');
    usedImageIntact(j.jobId, j.ids[0]);
    expect(removedPaths).toEqual([]);
    await step(ann, { step: 'import-finish', jobId: j.jobId });
    expect(brief(await step(ann, { step: 'import-cancel', jobId: j.jobId }))).toMatchObject({ status: 409 }); // 닫힌 뒤에도
    usedImageIntact(j.jobId, j.ids[0]);
  });

  it('만료 정리가 목록을 읽은 뒤 그사이 가져오기가 끝난 작업은 건너뛴다(쓰인 그림 보존)', async () => {
    const a = await rawJob(ann, [{ name: 'a.png', data: PNG(61) }]);
    const b = await rawJob(bob, [{ name: 'a.png', data: PNG(62) }]);
    const urlA = a.pages;
    const urlB = b.pages;
    let finished: 'ann' | 'bob' | null = null;
    // 정리가 한 작업의 파일을 지우려고 Storage를 기다리는 사이, **다른 쪽** 작업의 가져오기가 끝난다
    sw.onRemove = async (paths) => {
      const removingAnn = paths[0].startsWith(`${ann.id}/`);
      finished = removingAnn ? 'bob' : 'ann';
      const r = removingAnn ? await importWith(bob, urlB, { id: b.jobId, assets: { 'a.png': b.ids[0] } }) : await importWith(ann, urlA, { id: a.jobId, assets: { 'a.png': a.ids[0] } });
      expect(r.status).toBe(200);
    };
    // 두 작업이 모두 「하루 넘음」으로 보이는 시각으로 정리를 돌린다(가져오기 쪽은 실제 시각이라 아직 유효)
    const removed = await fs_.cleanupStaleImportJobs(Date.now() + 25 * 3_600_000);
    expect(finished).not.toBeNull();
    const [won, lost] = finished === 'bob' ? [b, a] : [a, b];
    expect(removed).toBe(2); // 먼저 잡힌 한 작업의 그림 1 + 글 묶음 1 — 끝난 쪽 작업의 것은 0
    expect(jobRow(lost.jobId).state).toBe('cancelled');
    expect(jobAll(lost.jobId)).toHaveLength(0);
    // 그사이 끝난 작업: 취소로 바뀌지 않았고 쓰인 그림이 줄·Storage 모두에 남아 있다
    expect(jobRow(won.jobId).state).toBe('done');
    usedImageIntact(won.jobId, won.ids[0]);
    await step(finished === 'bob' ? bob : ann, { step: 'import-finish', jobId: won.jobId });
    usedImageIntact(won.jobId, won.ids[0]);
  });

  it('취소가 먼저면 같은 작업의 가져오기는 페이지를 만들지 않는다', async () => {
    const j = await rawJob(ann, [{ name: 'a.png', data: PNG(63) }]);
    const url = j.pages;
    const n = blockCount(ann);
    // 취소가 파일을 지우려고 Storage를 기다리는 사이(상태는 이미 취소) 가져오기가 들어온다
    let late: { status: number; body: unknown } | undefined;
    sw.onRemove = async () => {
      late = await importWith(ann, url, { id: j.jobId, assets: { 'a.png': j.ids[0] } });
    };
    expect((await step(ann, { step: 'import-cancel', jobId: j.jobId })).body.removed).toBe(2);
    expect(late?.status).toBe(409);
    expect(blockCount(ann)).toBe(n);
    expect(jobFiles(j.jobId)).toHaveLength(0);
  });

  it('같은 작업으로 가져오기가 두 번 동시에 와도 페이지는 한 번만 만들어진다', async () => {
    const j = await rawJob(ann, [{ name: 'a.png', data: PNG(64) }]);
    const url = j.pages;
    const n = blockCount(ann);
    const [x, y] = await Promise.all([
      importWith(ann, url, { id: j.jobId, assets: { 'a.png': j.ids[0] } }),
      importWith(ann, url, { id: j.jobId, assets: { 'a.png': j.ids[0] } }),
    ]);
    expect([x.status, y.status]).toEqual([200, 200]);
    expect((y.body as any).pageIds).toEqual((x.body as any).pageIds);
    expect([(x.body as any).repeated, (y.body as any).repeated].filter(Boolean)).toHaveLength(1);
    expect(blockCount(ann) - n).toBe(2); // 페이지 1 + 그림 블록 1
    await step(ann, { step: 'import-finish', jobId: j.jobId });
  });

  it('브라우저: 열린 작업이 있으면 회원이 동의했을 때만 그것을 취소하고 새로 시작한다', async () => {
    const old = await rawJob(ann, [{ name: 'old.png', data: PNG(65) }]);
    const blob = () => new Blob([new Uint8Array(zip.writeZip(korean()))]);
    // 동의하지 않음(또는 물어볼 수단이 없음): 409 그대로, 앞 작업은 그대로
    await expect(prepareLargeZip(blob(), 'busy.zip', sp(ann), depsFor(ann))).rejects.toMatchObject({ status: 409 });
    await expect(prepareLargeZip(blob(), 'busy.zip', sp(ann), { ...depsFor(ann), confirmReplace: () => false })).rejects.toMatchObject({ status: 409 });
    expect(jobRow(old.jobId).state).toBe('open');
    expect(jobFiles(old.jobId)).toHaveLength(1);
    // 동의: 앞 작업을 취소(그 작업의 파일만 지움)하고 새 작업으로 진행
    const prep = await prepareLargeZip(blob(), 'busy.zip', sp(ann), { ...depsFor(ann), confirmReplace: () => true });
    expect(jobRow(old.jobId).state).toBe('cancelled');
    expect(jobAll(old.jobId)).toHaveLength(0);
    expect(prep.job!.id).not.toBe(old.jobId);
    expect((await importWith(ann, prep.url, prep.job)).status).toBe(200);
    await settleLargeZip(prep.job!.id, depsFor(ann));
  });
});

describe('서버가 다시 세는 한도(§11)', () => {
  it('작업 열기: 구성원·개수·합계·저장 용량·한 회원에 열린 작업 하나', async () => {
    expect((await step(ann, { step: 'import-begin', spaceId: sp(bob), files: 1, bytes: 10 })).status).toBe(403);
    expect((await step(ann, { step: 'import-begin', spaceId: sp(ann), files: ZIP_IMPORT_LIMITS.entries + 1, bytes: 10 })).status).toBe(400);
    expect((await step(ann, { step: 'import-begin', spaceId: sp(ann), files: 0, bytes: 10 })).status).toBe(400);
    expect((await step(ann, { step: 'import-begin', spaceId: sp(ann), files: 1, bytes: ZIP_IMPORT_LIMITS.zipBytes + 1 })).status).toBe(413);
    expect((await step(ann, { step: 'import-begin', spaceId: sp(ann), files: 1.5, bytes: 10 })).status).toBe(400);
    sw.quotaFull = true;
    const full = await step(ann, { step: 'import-begin', spaceId: sp(ann), files: 1, bytes: 10 });
    expect(full).toMatchObject({ status: 403, body: { code: 'STORAGE_FULL' } });
    sw.quotaFull = false;
    // 열린 작업이 있으면 새로 열지 않고 409로 알린다. 앞 작업과 그 파일은 그대로다(서버가 대신 지우지 않는다)
    const first = await rawJob(ann, [{ name: 'f.png', data: PNG(30) }]);
    const second = await step(ann, { step: 'import-begin', spaceId: sp(ann), files: 1, bytes: 10 });
    expect(second).toMatchObject({ status: 409, body: { code: 'IMPORT_JOB_OPEN', jobId: first.jobId } });
    expect(jobRow(first.jobId).state).toBe('open');
    expect(jobFiles(first.jobId)).toHaveLength(1);
    expect(removedPaths).toEqual([]);
    // 다른 회원은 영향을 받지 않는다
    const others = await step(bob, { step: 'import-begin', spaceId: sp(bob), files: 1, bytes: 10 });
    expect(others.status).toBe(200);
    await step(bob, { step: 'import-cancel', jobId: others.body.jobId });
    // 직접 취소한 뒤에는 열 수 있다
    expect((await step(ann, { step: 'import-cancel', jobId: first.jobId })).body.removed).toBe(2);
    const third = await step(ann, { step: 'import-begin', spaceId: sp(ann), files: 1, bytes: 10 });
    expect(third.status).toBe(200);
    await step(ann, { step: 'import-cancel', jobId: third.body.jobId });
  });

  it('같은 회원이 동시에 두 번 시작해도 하나만 열린다(DB 고유 색인)', async () => {
    const [a, b] = await Promise.all([
      step(ann, { step: 'import-begin', spaceId: sp(ann), files: 1, bytes: 10 }),
      step(ann, { step: 'import-begin', spaceId: sp(ann), files: 1, bytes: 10 }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const open = q<{ id: string }>("SELECT id FROM import_jobs WHERE user_id = ? AND state = 'open'", ann.id);
    expect(open).toHaveLength(1);
    const loser = a.status === 409 ? a : b;
    expect(loser.body).toMatchObject({ code: 'IMPORT_JOB_OPEN', jobId: open[0].id });
    // 코드의 사전 확인을 거치지 않고 줄을 직접 넣어도 DB가 막는다(다른 서버 인스턴스가 동시에 넣는 경우)
    expect(() => db.withRequestCache(() => db.db.prepare("INSERT INTO import_jobs (id, user_id, space_id, state, declared_files, declared_bytes, files, bytes, created_time, result) VALUES (?, ?, ?, 'open', 1, 1, 0, 0, ?, NULL)")
      .run('99999999-9999-4999-8999-999999999999', ann.id, sp(ann), Date.now()))).toThrow();
    // 끝난·취소된 작업은 여러 개여도 된다
    expect(q("SELECT id FROM import_jobs WHERE user_id = ? AND state <> 'open'", ann.id).length).toBeGreaterThan(1);
    await step(ann, { step: 'import-cancel', jobId: open[0].id });
  });

  it('하루 넘게 열려 있던 작업은 새로 시작할 때 만료로 정리하고 새 작업을 연다', async () => {
    const stale = await rawJob(ann, [{ name: 'stale.png', data: PNG(32) }]);
    db.withRequestCache(() => db.db.prepare('UPDATE import_jobs SET created_time = ? WHERE id = ?').run(Date.now() - 25 * 3_600_000, stale.jobId));
    const next = await step(ann, { step: 'import-begin', spaceId: sp(ann), files: 1, bytes: 10 });
    expect(next.status).toBe(200);
    expect(jobRow(stale.jobId).state).toBe('cancelled');
    expect(jobAll(stale.jobId)).toHaveLength(0);
    await step(ann, { step: 'import-cancel', jobId: next.body.jobId });
  });

  it('주소 받기: 알린 개수·합계를 넘기지 못하고, 파일 하나는 50MiB까지, 한 번에 50개까지', async () => {
    const b = await step(ann, { step: 'import-begin', spaceId: sp(ann), files: 2, bytes: 100 });
    const jobId = b.body.jobId;
    const sign = (items: unknown[]) => step(ann, { step: 'import-sign', jobId, items });
    expect((await sign([{ name: 'a.png', size: 60 }, { name: 'b.png', size: 41 }])).status).toBe(413); // 합계 초과
    expect((await sign([{ name: 'a.png', size: 1 }, { name: 'b.png', size: 1 }, { name: 'c.png', size: 1 }])).status).toBe(413); // 개수 초과
    expect((await sign([{ name: 'a.png', size: ZIP_IMPORT_LIMITS.fileBytes + 1 }])).status).toBe(413);
    expect((await sign([{ name: 'a.png', size: 0 }])).status).toBe(413);
    expect((await sign([])).status).toBe(400);
    expect((await sign(Array.from({ length: 51 }, () => ({ name: 'a.png', size: 1 })))).status).toBe(400);
    expect(jobFiles(jobId)).toHaveLength(0); // 거절된 요청은 줄을 만들지 않는다
    expect((await sign([{ name: 'a.png', size: 60 }])).status).toBe(200);
    expect((await sign([{ name: 'b.png', size: 41 }])).status).toBe(413); // 누적 합계 초과
    expect((await sign([{ name: 'b.png', size: 40 }])).status).toBe(200);
    expect((await sign([{ name: 'c.png', size: 1 }])).status).toBe(413); // 누적 개수 초과
    expect(jobRow(jobId)).toMatchObject({ files: 2, bytes: 100 });
    await step(ann, { step: 'import-cancel', jobId });
  });

  it('끝 알림: 알린 크기보다 크게 올라온 파일은 지우고 실패로 둔다. 올라오지 않은 파일도 실패', async () => {
    const b = await step(ann, { step: 'import-begin', spaceId: sp(ann), files: 3, bytes: 300 });
    const jobId = b.body.jobId;
    const s = await step(ann, { step: 'import-sign', jobId, items: [{ name: 'ok.png', size: 12 }, { name: 'grown.png', size: 12 }, { name: 'missing.png', size: 12 }] });
    const items = s.body.items as { id: string; uploadUrl: string }[];
    const path = (i: number) => items[i].uploadUrl.replace('https://store.test/upload/', '');
    objects.set(path(0), PNG(31));
    objects.set(path(1), Buffer.alloc(500, 3)); // 알린 12바이트보다 큼
    const d = await step(ann, { step: 'import-done', jobId, ids: items.map((i) => i.id) });
    expect(d.body.done).toEqual([items[0].id]);
    expect([...(d.body.failed as string[])].sort()).toEqual([items[1].id, items[2].id].sort());
    expect(objects.has(path(1))).toBe(false);
    expect(jobFiles(jobId).map((f) => `${f.name}:${Number(f.pending)}`)).toEqual(['missing.png:1', 'ok.png:0']);
    await step(ann, { step: 'import-cancel', jobId });
  });
});

describe('브라우저 쪽 ZIP 읽기(§11)', () => {
  const blobOf = (b: Buffer) => new Blob([new Uint8Array(b)]);
  /** 목록의 한 항목 머리글을 직접 고친다(크기 거짓말·암호 표시 등) */
  function patchCentral(buf: Buffer, name: string, edit: (b: Buffer, off: number) => void): Buffer {
    const out = Buffer.from(buf);
    for (let i = 0; i + 46 < out.length; i++) {
      if (out.readUInt32LE(i) !== 0x02014b50) continue;
      const n = out.readUInt16LE(i + 28);
      if (out.subarray(i + 46, i + 46 + n).toString('utf8') === name) edit(out, i);
    }
    return out;
  }

  it('경계: 52,428,800바이트까지는 예전 경로, 1바이트라도 넘으면 큰 ZIP 경로', () => {
    expect(ZIP_IMPORT_LIMITS.wholeUploadBytes).toBe(52_428_800);
    expect(isLargeZip({ name: 'a.zip', size: 52_428_800 })).toBe(false);
    expect(isLargeZip({ name: 'a.zip', size: 52_428_801 })).toBe(true);
    expect(isLargeZip({ name: 'A.ZIP', size: 60 * MB })).toBe(true);
    expect(isLargeZip({ name: 'a.pdf', size: 60 * MB })).toBe(false); // ZIP이 아닌 큰 파일은 예전 그대로(올리기 한도에 걸림)
  });

  it('이름 규칙이 서버 readZip과 같다', async () => {
    const names = ['a\\b\\c.md', 'x//y.md', './z.md', 'p/../q.md', '../../r.md', 'dir/', '__MACOSX/a.md', 'd/.DS_Store', 'sub/__MACOSX/keep.md', '.hidden', '한글/파일.md'];
    const z = zip.writeZip(names.map((name) => ({ name, data: 'x' })));
    expect((await readZipIndex(blobOf(z))).map((e) => e.name)).toEqual(zip.readZip(z).map((e) => e.name));
  });

  it('브라우저가 만든 글 파일 묶음을 서버 readZip이 그대로 읽는다', async () => {
    const built = buildStoredZip([{ name: '한글/문서.md', data: new TextEncoder().encode('# 문서\n') }, { name: 'a.csv', data: new TextEncoder().encode('A,B\n1,2\n') }, { name: 'empty.txt', data: new Uint8Array() }]);
    const read = zip.readZip(Buffer.from(await built.arrayBuffer()));
    expect(read.map((e) => [e.name, e.data.toString('utf8')])).toEqual([['한글/문서.md', '# 문서\n'], ['a.csv', 'A,B\n1,2\n'], ['empty.txt', '']]);
  });

  it('푸는 동안 바이트를 세어 한도를 넘으면 멈춘다(목록의 크기를 믿지 않는다)', async () => {
    const z = zip.writeZip([{ name: 'big.txt', data: Buffer.alloc(3 * MB, 0x41) }, { name: 'raw.bin', data: Buffer.from([1, 2, 3, 4, 5]) }]);
    const [big, raw] = await readZipIndex(blobOf(z));
    expect(big.method).toBe(8);
    expect(await readZipEntry(big, 1 * MB)).toBeNull();
    expect((await readZipEntry(big, 3 * MB))?.length).toBe(3 * MB);
    expect(await readZipEntry(raw, 4)).toBeNull();
    // 목록에 1바이트라고 적혀 있어도 실제로 푼 크기로 판단한다
    const lied = await readZipIndex(blobOf(patchCentral(z, 'big.txt', (b, off) => b.writeUInt32LE(1, off + 24))));
    expect(lied[0].size).toBe(1);
    expect(await readZipEntry(lied[0], lied[0].size)).toBeNull();
  });

  it('나누기: 글 파일·그림·건너뛴 것(지원 안 함·중복·숨김·암호·압축 방식·경로·50MiB 초과)', async () => {
    const base = zip.writeZip([
      { name: 'P.md', data: '# P\n' }, { name: 'a.png', data: PNG(40) }, { name: 'a.png', data: PNG(41) }, { name: 'clip.mp4', data: 'v' },
      { name: '.git/x.png', data: PNG(42) }, { name: 'locked.png', data: PNG(43) }, { name: 'odd.png', data: PNG(44) }, { name: 'huge.png', data: PNG(45) },
      { name: `${'d/'.repeat(40)}deep.png`, data: PNG(46) }, { name: 'inner.zip', data: zip.writeZip([{ name: 'x.md', data: 'x' }]) },
    ]);
    let z = patchCentral(base, 'locked.png', (b, off) => b.writeUInt16LE(b.readUInt16LE(off + 8) | 1, off + 8));
    z = patchCentral(z, 'odd.png', (b, off) => b.writeUInt16LE(12, off + 10));
    z = patchCentral(z, 'huge.png', (b, off) => b.writeUInt32LE(ZIP_IMPORT_LIMITS.fileBytes + 1, off + 24));
    const plan = await planLargeZip(blobOf(z));
    expect(plan.pages.map((e) => e.name)).toEqual(['P.md']);
    expect(plan.images.map((e) => e.name)).toEqual(['a.png']);
    const why = Object.fromEntries(plan.skipped.map((s) => [s.name.split('/').pop(), s.reason]));
    expect(why).toEqual({ 'a.png': 'duplicate', 'clip.mp4': 'unsupported', 'x.png': 'hidden', 'locked.png': 'encrypted', 'odd.png': 'bad_method', 'huge.png': 'too_large', 'deep.png': 'path', 'inner.zip': 'nested_zip' });
  });

  it('읽지 않는 형식: ZIP이 아님·항목 5,000개 초과·ZIP64 표시·1GiB 초과', async () => {
    await expect(readZipIndex(new Blob(['this is not a zip archive at all']))).rejects.toThrow('Not a zip archive');
    const many = zip.writeZip(Array.from({ length: 5001 }, (_, i) => ({ name: `n/${i}.txt`, data: '' })));
    await expect(planLargeZip(blobOf(many))).rejects.toThrow('Too many files in archive');
    const small = zip.writeZip([{ name: 'a.md', data: 'a' }]);
    const z64 = Buffer.from(small);
    z64.writeUInt16LE(0xffff, z64.length - 22 + 10);
    await expect(readZipIndex(blobOf(z64))).rejects.toThrow(ZipReadError);
    const tooBig = { size: ZIP_IMPORT_LIMITS.zipBytes + 1, slice: () => new Blob() } as unknown as Blob;
    await expect(planLargeZip(tooBig)).rejects.toThrow('ZIP is larger than 1 GB');
    // 겹친 ZIP의 항목도 같은 5,000개 예산에서 센다
    const nested = zip.writeZip([{ name: 'Export-a.zip', data: zip.writeZip(Array.from({ length: 3000 }, (_, i) => ({ name: `a${i}.md`, data: '' }))) }, { name: 'Export-b.zip', data: zip.writeZip(Array.from({ length: 3000 }, (_, i) => ({ name: `b${i}.md`, data: '' }))) }]);
    await expect(planLargeZip(blobOf(nested))).rejects.toThrow('Too many files in archive');
  });

  it('준비 단계: 글 파일이 없으면 통째 경로와 같은 문구, 올리기에 실패한 그림은 건너뛴 목록으로', async () => {
    await expect(prepareLargeZip(blobOf(zip.writeZip([{ name: 'a.png', data: PNG(50) }])), 'images.zip', sp(ann), depsFor(ann))).rejects.toThrow('No Markdown, HTML or CSV files found in images.zip');
    sw.putFails = true;
    const prep = await prepareLargeZip(blobOf(zip.writeZip(korean())), 'putfail.zip', sp(ann), depsFor(ann));
    expect(prep.images).toBe(0);
    expect(prep.skipped).toContainEqual({ name: `회의록 ${H1}/화면 캡처.png`, reason: 'upload_failed' });
    sw.putFails = false;
    const r = await importWith(ann, prep.url, prep.job);
    expect(r.status).toBe(200); // 그림 없이 글은 들어온다
    await settleLargeZip(prep.job!.id, depsFor(ann));
    expect(jobAll(prep.job!.id)).toHaveLength(0); // 올리지 못한 대기 줄과 다 쓴 글 묶음도 마무리에서 정리된다
  });
});

// 2026-11-19 Mac 검수 04807f920 P2(Master msg_a91f3a9fe702)
describe('글 파일 묶음도 그 작업의 파일이어야 한다(§9-5)', () => {
  const noPages = async (run: () => Promise<{ status: number; body: unknown }>) => {
    const n = blockCount(ann);
    const r = await run();
    expect(brief(r)).toEqual({ status: 400, message: 'p.zip: the pages file doesn’t belong to this import' });
    expect(blockCount(ann)).toBe(n);
  };

  it('같은 회원의 다른 ZIP·작업 밖 파일·다른 작업의 묶음·남의 묶음·끝내지 않은 묶음은 붙일 수 없다', async () => {
    const j = await rawJob(ann, [{ name: 'a.png', data: PNG(70) }]);
    const assets = { 'a.png': j.ids[0] };
    // 같은 회원이 예전 경로로 올린 다른 ZIP(DB 보관)
    const otherZip = storePages(ann, 'p.zip', [{ name: 'Other.md', data: '# Other\n' }]);
    await noPages(() => importWith(ann, otherZip.url, { id: j.jobId, assets }));
    await noPages(() => importWith(ann, otherZip.id, { id: j.jobId, assets }));
    // 같은 회원이 작업 밖에서 Storage로 올린 ZIP
    const signed = await fs_.signLargeUpload(ann, { name: 'big.zip', type: 'application/zip', size: 5 * MB, spaceId: sp(ann) });
    objects.set(String(signed.body.uploadUrl).replace('https://store.test/upload/', ''), Buffer.alloc(5 * MB, 1));
    await fs_.finishLargeUpload(ann, { id: signed.body.id });
    await noPages(() => importWith(ann, String(signed.body.id), { id: j.jobId, assets }));
    // 다른 회원의 작업 글 묶음
    const theirs = await rawJob(bob, [{ name: 'a.png', data: PNG(71) }]);
    await noPages(() => importWith(ann, theirs.pages, { id: j.jobId, assets }));
    // 이 작업의 그림 파일을 글 묶음 자리에 넣기
    await noPages(() => importWith(ann, j.ids[0], { id: j.jobId, assets: {} }));
    // 글 묶음 파일 id를 그림 표에 넣기
    const n = blockCount(ann);
    expect((await importWith(ann, j.pages, { id: j.jobId, assets: { 'a.png': j.pages } })).status).toBe(400);
    expect(blockCount(ann)).toBe(n);
    // 바르게 보내면 된다. 끝난 뒤 그 묶음을 **다른 작업**에 다시 쓰려 하면 거절
    expect((await importWith(ann, j.pages, { id: j.jobId, assets })).status).toBe(200);
    const next = await rawJob(ann, [{ name: 'a.png', data: PNG(72) }], { pages: null });
    await noPages(() => importWith(ann, j.pages, { id: next.jobId, assets: { 'a.png': next.ids[0] } }));
    // 묶음을 아직 올리지 않은 작업(등록 없음)·끝 알림을 하지 않은 묶음
    const pending = await jobPages(ann, next.jobId, DEFAULT_PAGES, { finish: false });
    await noPages(() => importWith(ann, pending, { id: next.jobId, assets: { 'a.png': next.ids[0] } }));
    await step(ann, { step: 'import-cancel', jobId: next.jobId });
    await step(bob, { step: 'import-cancel', jobId: theirs.jobId });
    await step(ann, { step: 'import-finish', jobId: j.jobId });
  });

  it('글 묶음은 작업당 하나이고 알린 개수·크기에 든다. 가져온 뒤 마무리에서 지워진다', async () => {
    const data = zip.writeZip(DEFAULT_PAGES);
    const b = await step(ann, { step: 'import-begin', spaceId: sp(ann), files: 2, bytes: 12 + data.length });
    const jobId = String(b.body.jobId);
    expect((await step(ann, { step: 'import-pages', jobId, name: 'p.zip', size: data.length + 13 })).status).toBe(409); // 알린 합계(12 + 묶음 크기) 초과
    expect((await step(ann, { step: 'import-pages', jobId, name: 'p.zip', size: 0 })).status).toBe(413);
    expect((await step(ann, { step: 'import-pages', jobId, name: 'p.zip', size: ZIP_IMPORT_LIMITS.wholeUploadBytes + 1 })).status).toBe(413);
    expect(jobAll(jobId)).toHaveLength(0);
    const first = await step(ann, { step: 'import-pages', jobId, name: 'p.zip', size: data.length });
    expect(first.status).toBe(200);
    expect((await step(ann, { step: 'import-pages', jobId, name: 'p2.zip', size: 1 })).status).toBe(409); // 두 번째 묶음은 받지 않는다
    expect(jobRow(jobId)).toMatchObject({ pages_file_id: first.body.id, files: 1 });
    expect(jobAll(jobId)).toHaveLength(1);
    // 남의 작업에는 올릴 수 없다
    expect((await step(bob, { step: 'import-pages', jobId, name: 'p.zip', size: 1 })).status).toBe(404);
    await step(ann, { step: 'import-cancel', jobId });
    expect(jobAll(jobId)).toHaveLength(0);
  });

  it('크기 초과 파일: Storage 삭제가 확인된 뒤에만 줄을 지운다(실패하면 남겨 두고 작업 정리가 지운다)', async () => {
    const b = await step(ann, { step: 'import-begin', spaceId: sp(ann), files: 1, bytes: 100 });
    const jobId = String(b.body.jobId);
    const s = await step(ann, { step: 'import-sign', jobId, items: [{ name: 'grown.png', size: 12 }] });
    const it0 = (s.body.items as { id: string; uploadUrl: string }[])[0];
    const path = it0.uploadUrl.replace('https://store.test/upload/', '');
    objects.set(path, Buffer.alloc(500, 3));
    sw.removeFails = true;
    expect((await step(ann, { step: 'import-done', jobId, ids: [it0.id] })).body).toEqual({ done: [], failed: [it0.id] });
    expect(jobAll(jobId).map((f) => `${f.name}:${Number(f.pending)}`)).toEqual(['grown.png:1']); // 줄이 남아 있다(대기 그대로 — 가져오기에는 쓸 수 없다)
    expect(objects.has(path)).toBe(true);
    sw.removeFails = false;
    expect((await step(ann, { step: 'import-cancel', jobId })).body.removed).toBe(1);
    expect(jobAll(jobId)).toHaveLength(0);
    expect(objects.has(path)).toBe(false);
  });
});

describe('응답이 불확실할 때(504 등)는 취소하기 전에 상태를 한 번 확인한다', () => {
  const calls: string[] = [];
  const spied = (m: M): LargeZipDeps => {
    const d = depsFor(m);
    return { ...d, job: (body) => (calls.push(String(body.step)), d.job(body)) };
  };
  const err = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });
  beforeEach(() => { calls.length = 0; });

  it('504: 이미 끝났으면 그 결과를 쓰고 취소하지 않는다', async () => {
    const j = await rawJob(ann, [{ name: 'a.png', data: PNG(73) }]);
    const r = await importWith(ann, j.pages, { id: j.jobId, assets: { 'a.png': j.ids[0] } });
    expect(r.status).toBe(200);
    for (const status of [504, 502, 500, 408, 429]) {
      calls.length = 0;
      const got = await settleLargeZip(j.jobId, spied(ann), err(status));
      expect(got).toEqual({ pageIds: (r.body as any).pageIds, pages: 1, databases: 0 });
      expect(calls).toEqual(['import-status', 'import-finish']);
    }
    expect(jobFiles(j.jobId).map((f) => f.id)).toEqual([j.ids[0]]);
  });

  it('504: 아직 끝나지 않았으면 지우지도 다시 보내지도 않는다', async () => {
    const j = await rawJob(ann, [{ name: 'a.png', data: PNG(74) }]);
    expect(await settleLargeZip(j.jobId, spied(ann), err(504))).toBeNull();
    expect(calls).toEqual(['import-status']);
    expect(jobRow(j.jobId).state).toBe('open');
    expect(jobAll(j.jobId)).toHaveLength(2);
    expect(removedPaths).toEqual([]);
    // 분명한 거절(4xx)은 상태 조회 없이 취소·정리한다
    calls.length = 0;
    expect(await settleLargeZip(j.jobId, spied(ann), err(400))).toBeNull();
    expect(calls).toEqual(['import-cancel']);
    expect(jobRow(j.jobId).state).toBe('cancelled');
    expect(jobAll(j.jobId)).toHaveLength(0);
  });
});

// Mac 검수 P1: 서로 다른 DB 연결 사이의 경합. 앱은 동기 DB 다리(연결 하나)를 쓰므로 시험이 두 번째 연결을 따로 열어
// 「다른 서버 인스턴스」 역할을 시킨다. 그 연결은 한 번에 보낸 문장 묶음으로 작업 줄을 바꾼 뒤 2초 쉬었다가 커밋/되돌린다.
// 앱의 조건부 UPDATE는 그 줄의 잠금이 풀릴 때까지 기다렸다가 다시 판단한다.
describe('다른 DB 연결과의 경합: 완료·취소·새 시작·만료', () => {
  const HOLD = 2;
  const conn = () => postgres(process.env.AWW_DATABASE_URL!, { max: 1, onnotice: () => {} });
  /** 다른 연결이 작업 줄을 잡을 때까지 기다린다(세 번째 연결의 SKIP LOCKED 조회가 0줄이면 잡힌 것) */
  async function untilLocked(jobId: string) {
    const probe = conn();
    try {
      for (let i = 0; i < 100; i++) {
        if ((await probe.unsafe(`SELECT id FROM import_jobs WHERE id = '${jobId}' FOR UPDATE SKIP LOCKED`)).length === 0) return Date.now();
        await new Promise((r) => setTimeout(r, 30));
      }
      throw new Error('다른 연결이 잠금을 잡지 못했습니다');
    } finally {
      await probe.end();
    }
  }
  /** 다른 연결에서: 작업 줄을 바꾸고 HOLD초 뒤 끝낸다 */
  function hold(other: ReturnType<typeof conn>, change: string, end: 'COMMIT' | 'ROLLBACK') {
    return other.unsafe(`BEGIN; ${change}; SELECT pg_sleep(${HOLD}); ${end};`).simple().execute();
  }
  const completeSql = (jobId: string, used: string) => `UPDATE import_jobs SET state = 'done', result = '${JSON.stringify({ pageIds: ['00000000-0000-4000-8000-00000000aaaa'], pages: 1, databases: 0, used: [used] })}' WHERE id = '${jobId}' AND state = 'open'`;
  const waited = (since: number) => expect(Date.now() - since).toBeGreaterThanOrEqual((HOLD - 1) * 1000);
  const intact = (jobId: string, id: string) => {
    const left = jobFiles(jobId);
    expect(left.map((f) => f.id)).toEqual([id]);
    expect(objects.has(left[0].storage_path)).toBe(true);
  };

  it('다른 연결의 완료가 먼저 커밋되면 직접 취소는 기다렸다가 409 — 쓰인 그림이 남는다', async () => {
    const j = await rawJob(ann, [{ name: 'a.png', data: PNG(80) }]);
    const other = conn();
    try {
      const done = hold(other, completeSql(j.jobId, j.ids[0]), 'COMMIT');
      const t = await untilLocked(j.jobId);
      const r = await step(ann, { step: 'import-cancel', jobId: j.jobId }); // 읽을 때는 아직 open으로 보인다
      waited(t);
      await done;
      expect(r.status).toBe(409);
      expect(jobRow(j.jobId).state).toBe('done');
      intact(j.jobId, j.ids[0]);
      expect(removedPaths).toEqual([]);
      expect((await step(ann, { step: 'import-finish', jobId: j.jobId })).body.removed).toBe(1); // 글 묶음만
      intact(j.jobId, j.ids[0]);
    } finally {
      await other.end();
    }
  }, 60_000);

  it('다른 연결의 완료가 되돌려지면 기다리던 취소가 진행된다', async () => {
    const j = await rawJob(ann, [{ name: 'a.png', data: PNG(81) }]);
    const other = conn();
    try {
      const undone = hold(other, completeSql(j.jobId, j.ids[0]), 'ROLLBACK');
      const t = await untilLocked(j.jobId);
      const r = await step(ann, { step: 'import-cancel', jobId: j.jobId });
      waited(t);
      await undone;
      expect(r).toMatchObject({ status: 200, body: { removed: 2 } });
      expect(jobRow(j.jobId).state).toBe('cancelled');
      expect(jobAll(j.jobId)).toHaveLength(0);
    } finally {
      await other.end();
    }
  }, 60_000);

  it('만료 정리도 다른 연결의 완료를 기다렸다가 건너뛴다', async () => {
    const j = await rawJob(ann, [{ name: 'a.png', data: PNG(82) }]);
    const other = conn();
    try {
      const done = hold(other, completeSql(j.jobId, j.ids[0]), 'COMMIT');
      const t = await untilLocked(j.jobId);
      const removed = await fs_.cleanupStaleImportJobs(Date.now() + 25 * 3_600_000); // 이 작업이 「하루 넘음」으로 보이는 시각
      waited(t);
      await done;
      expect(removed).toBe(0);
      expect(jobRow(j.jobId).state).toBe('done');
      intact(j.jobId, j.ids[0]);
      await step(ann, { step: 'import-finish', jobId: j.jobId });
      intact(j.jobId, j.ids[0]);
    } finally {
      await other.end();
    }
  }, 60_000);

  it('다른 연결이 먼저 취소하면 같은 작업의 가져오기는 기다렸다가 페이지를 만들지 않는다', async () => {
    const j = await rawJob(ann, [{ name: 'a.png', data: PNG(83) }]);
    const n = blockCount(ann);
    const other = conn();
    try {
      const cancelled = hold(other, `UPDATE import_jobs SET state = 'cancelled' WHERE id = '${j.jobId}' AND state = 'open'`, 'COMMIT');
      const t = await untilLocked(j.jobId);
      const r = await importWith(ann, j.pages, { id: j.jobId, assets: { 'a.png': j.ids[0] } });
      waited(t);
      await cancelled;
      expect(brief(r).status).toBe(409);
      expect(blockCount(ann)).toBe(n);
      expect(jobRow(j.jobId).state).toBe('cancelled');
      expect((await step(ann, { step: 'import-cancel', jobId: j.jobId })).body.removed).toBe(2); // 취소된 작업의 남은 파일 정리
    } finally {
      await other.end();
    }
  }, 60_000);

  it('다른 연결이 같은 회원의 작업을 여는 중이면 새 시작은 기다렸다가 409(열린 작업 하나)', async () => {
    const otherJob = '77777777-7777-4777-8777-7777777777aa';
    const other = conn();
    try {
      const opening = other.unsafe(`BEGIN; INSERT INTO import_jobs (id, user_id, space_id, state, declared_files, declared_bytes, files, bytes, created_time, result) VALUES ('${otherJob}', '${ann.id}', '${sp(ann)}', 'open', 1, 1, 0, 0, ${Date.now()}, NULL); SELECT pg_sleep(${HOLD}); COMMIT;`).simple().execute();
      await new Promise((r) => setTimeout(r, 500)); // 아직 커밋 전이라 다른 연결에서는 보이지 않는다
      expect(q('SELECT id FROM import_jobs WHERE id = ?', otherJob)).toHaveLength(0);
      const t = Date.now();
      const r = await step(ann, { step: 'import-begin', spaceId: sp(ann), files: 1, bytes: 10 }); // 사전 확인은 통과하고 줄 추가가 고유 색인에서 기다린다
      expect(Date.now() - t).toBeGreaterThanOrEqual((HOLD - 1) * 1000);
      await opening;
      expect(r).toMatchObject({ status: 409, body: { code: 'IMPORT_JOB_OPEN', jobId: otherJob } });
      expect(q("SELECT id FROM import_jobs WHERE user_id = ? AND state = 'open'", ann.id)).toEqual([{ id: otherJob }]);
      await step(ann, { step: 'import-cancel', jobId: otherJob });
    } finally {
      await other.end();
    }
  }, 60_000);
});

// 2026-11-19 Mac 재검수 P2(Master msg_547f81d99092): 주기 정리(cron이 부르는 cleanupPendingUploads) 한 회차 안에서
// 작업 정리의 Storage 삭제가 실패하면, 뒤이은 일반 「대기 파일 정리」가 그 줄을 지워 버리지 않아야 한다.
describe('주기 정리: Storage 삭제가 실패한 회차에는 줄을 남기고 다음 회차에 지운다', () => {
  const OLD = () => Date.now() - 25 * 3_600_000;
  const age = (sql: string, ...p: unknown[]) => db.withRequestCache(() => db.db.prepare(sql).run(OLD(), ...p));
  /** 작업 밖에서 올리기 주소만 받고 끝내지 않은 일반 대기 파일 */
  async function genericPending(m: M, name: string, upload: boolean) {
    const signed = await fs_.signLargeUpload(m, { name, type: 'application/octet-stream', size: 5 * MB, spaceId: sp(m) });
    const path = String(signed.body.uploadUrl).replace('https://store.test/upload/', '');
    if (upload) objects.set(path, Buffer.alloc(16, 5));
    return { id: String(signed.body.id), path };
  }
  const fileExists = (id: string) => q('SELECT id FROM files WHERE id = ?', id).length === 1;

  it('작업 파일은 작업 정리만 지우고, 실패한 회차에는 작업 파일·일반 대기 파일 모두 남는다 → 다음 회차에 객체와 줄이 함께 정리된다', async () => {
    // 하루 넘은 열린 작업: 올리기를 끝낸 그림 1 + 끝내지 않은(대기) 그림 1(객체는 올라가 있음) + 글 묶음
    const b = await step(ann, { step: 'import-begin', spaceId: sp(ann), files: 3, bytes: 5000 });
    const jobId = String(b.body.jobId);
    const s = await step(ann, { step: 'import-sign', jobId, items: [{ name: 'done.png', size: 12 }, { name: 'pending.png', size: 12 }] });
    const items = s.body.items as { id: string; uploadUrl: string }[];
    const paths = items.map((i) => i.uploadUrl.replace('https://store.test/upload/', ''));
    paths.forEach((p, k) => objects.set(p, PNG(90 + k)));
    await step(ann, { step: 'import-done', jobId, ids: [items[0].id] });
    const pages = await jobPages(ann, jobId, DEFAULT_PAGES);
    age('UPDATE import_jobs SET created_time = ? WHERE id = ?', jobId);
    age('UPDATE files SET created_time = ? WHERE import_job_id = ?', jobId);
    // 일반 대기 파일(작업 밖): 하루 넘은 것 둘(객체 있음·없음), 그리고 살아 있는 것들
    const oldWith = await genericPending(ann, 'old-with.bin', true);
    const oldWithout = await genericPending(ann, 'old-without.bin', false);
    age('UPDATE files SET created_time = ? WHERE id IN (?, ?)', oldWith.id, oldWithout.id);
    const freshGeneric = await genericPending(bob, 'fresh.bin', true); // 다른 회원의 최근 대기 파일
    const liveJob = await rawJob(bob, [{ name: 'live.png', data: PNG(95) }]); // 다른 회원의 진행 중 작업
    const jobPaths = jobAll(jobId).map((f) => f.storage_path);
    expect(jobPaths).toHaveLength(3);

    // --- 회차 1: Storage 삭제가 실패한다
    sw.removeFails = true;
    expect(await fs_.cleanupPendingUploads()).toBe(0);
    expect(jobRow(jobId).state).toBe('cancelled'); // 작업은 만료로 취소됐지만
    expect(jobAll(jobId)).toHaveLength(3); // 줄은 그대로다(대기 줄 pending.png 포함 — 일반 정리가 지우지 않았다)
    expect(jobPaths.every((p) => objects.has(p))).toBe(true);
    expect(fileExists(oldWith.id)).toBe(true); // 일반 대기 파일도 삭제가 확인되지 않아 남는다
    expect(objects.has(oldWith.path)).toBe(true);
    expect(fileExists(oldWithout.id)).toBe(true); // 삭제 호출 자체가 실패한 회차라 부재 확인도 하지 않는다

    // --- 회차 1-2: 삭제는 되지만 「없음」 확인(목록 조회)이 실패한다 → 지워진 것만 정리, 애초에 없던 것은 남는다
    sw.removeFails = false;
    sw.listFails = true;
    expect(await fs_.cleanupPendingUploads()).toBe(1); // old-with.bin(삭제 확인)
    expect(jobAll(jobId)).toHaveLength(0); // 작업 파일 3개는 모두 객체가 있었으므로 삭제 확인
    expect(jobPaths.some((p) => objects.has(p))).toBe(false);
    expect(fileExists(oldWith.id)).toBe(false);
    expect(objects.has(oldWith.path)).toBe(false);
    expect(fileExists(oldWithout.id)).toBe(true); // 없다는 확인을 못 했다

    // --- 회차 2: 정상
    sw.listFails = false;
    expect(await fs_.cleanupPendingUploads()).toBe(1); // old-without.bin(부재 확인)
    expect(fileExists(oldWithout.id)).toBe(false);

    // 살아 있는 것들은 그대로
    expect(fileExists(freshGeneric.id)).toBe(true);
    expect(objects.has(freshGeneric.path)).toBe(true);
    expect(jobRow(liveJob.jobId).state).toBe('open');
    expect(jobAll(liveJob.jobId)).toHaveLength(2);
    expect(jobAll(liveJob.jobId).every((f) => objects.has(f.storage_path))).toBe(true);
    void pages;
    await step(bob, { step: 'import-cancel', jobId: liveJob.jobId });
    await fs_.finishLargeUpload(bob, { id: freshGeneric.id });
  });

  it('하루 넘은 작업의 대기 파일은 일반 정리 대상이 아니다(작업이 살아 있으면 건드리지 않는다)', async () => {
    // 작업은 최근에 열렸지만 파일 줄의 시각만 오래된 경우(시계 차이 등) — 일반 정리가 작업 파일을 지우면 안 된다
    const j = await rawJob(ann, [{ name: 'slow.png', data: PNG(96) }], { finish: false });
    age('UPDATE files SET created_time = ? WHERE import_job_id = ?', j.jobId);
    expect(await fs_.cleanupPendingUploads()).toBe(0);
    expect(jobRow(j.jobId).state).toBe('open');
    expect(jobAll(j.jobId)).toHaveLength(2);
    expect(removedPaths).toEqual([]);
    // 이어서 끝 알림을 하면 정상으로 쓸 수 있다
    expect((await step(ann, { step: 'import-done', jobId: j.jobId, ids: j.ids })).body.done).toEqual(j.ids);
    expect((await importWith(ann, j.pages, { id: j.jobId, assets: { 'a.png': j.ids[0] } })).status).toBe(200);
    await step(ann, { step: 'import-finish', jobId: j.jobId });
  });

  it('올리지 못해 Storage에 없는 작업 파일도 「없음」이 확인되면 줄을 지운다', async () => {
    const b = await step(ann, { step: 'import-begin', spaceId: sp(ann), files: 2, bytes: 100 });
    const jobId = String(b.body.jobId);
    const s = await step(ann, { step: 'import-sign', jobId, items: [{ name: 'never.png', size: 12 }, { name: 'there.png', size: 12 }] });
    const items = s.body.items as { id: string; uploadUrl: string }[];
    objects.set(items[1].uploadUrl.replace('https://store.test/upload/', ''), PNG(97)); // 하나만 올라갔다
    sw.listFails = true;
    expect((await step(ann, { step: 'import-cancel', jobId })).body.removed).toBe(1); // 지워진 것만
    expect(jobAll(jobId).map((f) => f.name)).toEqual(['never.png']);
    sw.listFails = false;
    expect((await step(ann, { step: 'import-cancel', jobId })).body.removed).toBe(1); // 없음 확인 → 줄 정리
    expect(jobAll(jobId)).toHaveLength(0);
  });
});
