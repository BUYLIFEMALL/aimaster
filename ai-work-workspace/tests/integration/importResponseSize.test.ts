// 문서가 많은 가져오기의 응답 크기 — WS-20261119-03, Master msg_8465c125b33a.
// importFiles는 바뀐 레코드를 응답 recordMap에 모두 실었다. 문서가 수백 쪽이면 응답이 수 MB가 되어 서버리스 응답 한도(4.5MB)를 넘는다.
// 바뀐 레코드가 1,000개를 넘는 가져오기만 뿌리 페이지 범위로 줄이고, 나머지는 화면이 원래 쓰던 지연 로드(loadPage·getSidebarChildren)로 읽는다.
// 적은 가져오기의 응답은 한 글자도 바뀌지 않아야 한다(importZipBaseline 스냅숏이 따로 고정).
// 로컬 전용 fixture만 쓴다(AWW_LOCAL_ADMIN_URL·AWW_LOCAL_APP_URL).
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let db: typeof import('../../src/litpage/server/db.ts');
let files: typeof import('../../src/litpage/server/content/files.ts');
let zip: typeof import('../../src/litpage/server/content/zip.ts');

const sue = { id: '66666666-6666-4666-8666-666666666666', email: 'size-sue@example.com', name: '수' };
let spaceId = '';

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  db = await import('../../src/litpage/server/db.ts');
  files = await import('../../src/litpage/server/content/files.ts');
  zip = await import('../../src/litpage/server/content/zip.ts');
  await runtime.runRpc('loadAccountData', {}, sue);
  const r = await runtime.runRpc('createWorkspace', { name: '응답 크기' }, sue);
  spaceId = (r.body as any).spaceId ?? (r.body as any).space?.id ?? (r.body as any).id;
  expect(spaceId).toBeTruthy();
});

const hex = (i: number) => i.toString(16).padStart(32, '0');
const body = (title: string, lines: number) => [`# ${title}`, '', ...Array.from({ length: lines }, (_, i) => `문단 ${i} — 합성 본문 [바깥](https://example.com/${i})\n`)].join('\n');

/** 노션 Markdown+CSV 내보내기 모양: 맨 위 페이지 1 + 데이터베이스 dbs개(CSV + 행 페이지 rows개씩) */
function exportZip(dbs: number, rows: number, lines: number) {
  const root = `Root ${hex(1)}`;
  const entries: { name: string; data: string }[] = [];
  const links: string[] = [];
  for (let d = 0; d < dbs; d++) {
    const name = `Table${d} ${hex(1000 + d)}`;
    const csv = ['Name,Status'];
    for (let r = 0; r < rows; r++) {
      const title = `Row ${d}-${r}`;
      csv.push(`${title},${r % 2 ? 'Done' : 'Todo'}`);
      entries.push({ name: `${root}/${name}/${title} ${hex(100000 + d * 10000 + r)}.md`, data: body(title, lines) });
    }
    entries.push({ name: `${root}/${name}.csv`, data: csv.join('\n') + '\n' });
    links.push(`[${name}](${encodeURIComponent(root)}/${encodeURIComponent(name)}.csv)`);
  }
  entries.unshift({ name: `${root}.md`, data: `# Root\n\n첫 문단\n\n${links.join('\n\n')}\n` });
  return zip.writeZip(entries);
}

const put = (name: string, data: Buffer | string, mime: string) => db.withRequestCache(() => files.storeFile(name, data, sue.id, spaceId, mime));
const run = (parent: unknown, name: string, data: Buffer | string, mime = 'application/zip') => runtime.runRpc('importFiles', { spaceId, parent, files: [{ name, url: put(name, data, mime).url }] }, sue);
const ids = (body: any, table: string) => Object.keys(body.recordMap?.[table] ?? {});
const value = (body: any, table: string, id: string) => body.recordMap?.[table]?.[id]?.value?.value;
const stored = (table: string) => Number((db.db.prepare('SELECT count(*) AS n FROM records WHERE tbl = ?').get(table) as { n: number }).n);
const bytes = (body: unknown) => Buffer.byteLength(JSON.stringify(body));
const LIMIT = 4.5 * 1024 * 1024;

describe('가져오기 응답 크기', () => {
  it('적은 가져오기는 예전처럼 바뀐 레코드를 모두 싣는다', async () => {
    const before = stored('block');
    const r = await run({ kind: 'private' }, 'small.zip', exportZip(2, 3, 4));
    expect(r.status).toBe(200);
    const b = r.body as any;
    expect(b.partial).toBeUndefined();
    expect(b.pageIds).toHaveLength(1);
    // 새로 만든 블록이 모두 응답에 있다(본문·행·행 본문까지)
    expect(ids(b, 'block')).toHaveLength(stored('block') - before);
    expect(ids(b, 'block').length).toBeGreaterThan(20);
    expect(ids(b, 'collection')).toHaveLength(2);
  });

  it('많은 가져오기는 뿌리 페이지 범위만 싣고, 나머지는 화면의 지연 로드로 읽힌다', async () => {
    const before = stored('block');
    const r = await run({ kind: 'private' }, 'many.zip', exportZip(4, 12, 24)); // 49쪽 · 블록 약 1,300개
    expect(r.status).toBe(200);
    const b = r.body as any;
    const made = stored('block') - before;
    expect(made).toBeGreaterThan(1000);
    expect(b.partial).toBe(true);
    expect(b.pages).toBe(1); // 데이터베이스의 행 페이지는 쪽 수에 세지 않는다(기존 동작)
    expect(b.databases).toBe(4);
    // 응답의 블록은 뿌리 페이지 하나뿐이다
    expect(ids(b, 'block')).toEqual(b.pageIds);
    expect(ids(b, 'collection')).toEqual([]);
    const root = value(b, 'block', b.pageIds[0]);
    expect((root.properties.title ?? []).map((d: any) => d[0]).join('')).toBe('Root');
    expect(root.content.length).toBeGreaterThan(0); // 하위는 id만 — 레코드는 싣지 않았다
    // 사이드바 「내 페이지」 목록(space_view)은 실려 있고 새 뿌리가 들어 있다
    const sv = Object.values(b.recordMap.space_view ?? {}).map((x: any) => x.value.value);
    expect(sv).toHaveLength(1);
    expect(sv[0].private_pages).toContain(b.pageIds[0]);
    expect(bytes(b)).toBeLessThan(20_000);

    // 화면이 뿌리 페이지를 열 때 부르는 loadPage: 본문 블록과 하위 데이터베이스가 온다
    const page = await runtime.runRpc('loadPage', { pageId: b.pageIds[0] }, sue);
    expect(page.status).toBe(200);
    const loaded = page.body as any;
    for (const id of root.content) expect(loaded.recordMap.block[id], `하위 ${id}`).toBeTruthy();
    const subs = root.content.map((id: string) => value(loaded, 'block', id)).filter((x: any) => x.type === 'collection_view_page' || x.type === 'collection_view' || x.type === 'page');
    expect(subs.length).toBe(4);
    // 사이드바가 하위 페이지를 펼칠 때 부르는 getSidebarChildren
    const side = await runtime.runRpc('getSidebarChildren', { blockIds: [b.pageIds[0]] }, sue);
    expect(side.status).toBe(200);
    expect(Object.keys((side.body as any).recordMap.block ?? {}).length).toBeGreaterThanOrEqual(4);
    // 하위 데이터베이스 페이지도 열린다(행은 그 화면이 따로 조회한다)
    const dbPage = await runtime.runRpc('loadPage', { pageId: subs[0].id }, sue);
    expect(dbPage.status).toBe(200);
    expect(Object.keys((dbPage.body as any).recordMap.collection ?? {})).toContain(subs[0].collection_id);
  });

  it('열려 있는 페이지 아래로 많이 가져오면 부모 페이지(새 하위가 붙은 값)도 싣는다', async () => {
    const host = await run({ kind: 'private' }, 'Host.md', '# Host\n\n기존 문단\n', 'text/markdown');
    const hostId = (host.body as any).pageIds[0];
    const r = await run({ kind: 'page', pageId: hostId }, 'under.zip', exportZip(4, 12, 24));
    expect(r.status).toBe(200);
    const b = r.body as any;
    expect(b.partial).toBe(true);
    expect(ids(b, 'block').sort()).toEqual([hostId, ...b.pageIds].sort());
    expect(value(b, 'block', hostId).content).toContain(b.pageIds[0]);
    expect(value(b, 'block', b.pageIds[0]).parent_id).toBe(hostId);
    expect(b.recordMap.space_view).toBeUndefined(); // 「내 페이지」 목록은 바뀌지 않았다
  });

  it('뿌리가 데이터베이스면 그 컬렉션과 보기도 싣는다(제목·아이콘·표 화면에 필요)', async () => {
    const csv = ['Name,Status', ...Array.from({ length: 1100 }, (_, i) => `Item ${i},${i % 2 ? 'Done' : 'Todo'}`)].join('\n') + '\n';
    const r = await run({ kind: 'private' }, 'Big.csv', csv, 'text/csv');
    expect(r.status).toBe(200);
    const b = r.body as any;
    expect(b.partial).toBe(true);
    expect(ids(b, 'block')).toEqual(b.pageIds);
    const root = value(b, 'block', b.pageIds[0]);
    expect(root.type).toBe('collection_view_page');
    expect(ids(b, 'collection')).toEqual([root.collection_id]);
    expect(ids(b, 'collection_view').sort()).toEqual([...root.view_ids].sort());
    expect(bytes(b)).toBeLessThan(50_000);
    expect(bytes(b)).toBeLessThan(LIMIT);
  });
});
