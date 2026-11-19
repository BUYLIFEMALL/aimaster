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

// 2026-11-19(WS-20261119-03 응답 바이트, Master msg_652436d7b405): 개수 기준과 별개로 응답 본문 전체(봉투·포인터 포함)의 UTF-8 바이트 예산.
// 넘으면 기존 partial 계약을 다시 쓰고, partial도 넘으면 못 실은 레코드를 버리지 않고 pending 포인터로 돌려준다.
describe('가져오기 응답 바이트 예산', () => {
  let imp: typeof import('../../src/litpage/server/api/modules/import.ts');
  let pend: typeof import('../../src/litpage/web/features/import/importPending.ts');
  const tom = { id: '67676767-6767-4767-8767-676767676767', email: 'size-tom@example.com', name: '톰' };
  beforeAll(async () => {
    imp = await import('../../src/litpage/server/api/modules/import.ts');
    pend = await import('../../src/litpage/web/features/import/importPending.ts');
    await runtime.runRpc('loadAccountData', {}, tom);
  });

  type Change = { table: any; record: any };
  /** 전체 응답(모든 레코드가 실린)에서 바뀐 레코드 목록을 되살린다 — buildImportResponse의 입력 */
  const changesOf = (b: any): Change[] => Object.entries(b.recordMap).filter(([t]) => t !== '__version__').flatMap(([table, recs]) => Object.values(recs as any).map((e: any) => ({ table, record: e.value.value })));
  const baseOf = (b: any) => ({ pageIds: b.pageIds as string[], pages: b.pages as number, databases: b.databases as number });
  const build = (b: any, target: { table: string; id: string }, budget?: number, changes = changesOf(b)) => db.withRequestCache(() => imp.buildImportResponse(sue.id, baseOf(b), changes, target, budget)) as any;
  const keys = (body: any) => Object.entries(body.recordMap).filter(([t]) => t !== '__version__').flatMap(([t, recs]) => Object.keys(recs as any).map((id) => `${t}:${id}`));
  const ptr = (p: { table: string; id: string }) => `${p.table}:${p.id}`;
  const pointerBytes = (k: string) => bytes({ table: k.slice(0, k.indexOf(':')), id: k.slice(k.indexOf(':') + 1) }) + 1;
  /** 모든 선택 칸이 붙은 빈 본문 + 표 이름 칸: 이보다 작은 예산은 본문 자체가 들어가지 않는다 */
  const floorOf = (b: any, set: string[]) => bytes({ ...baseOf(b), recordMap: { __version__: 3 }, partial: true, pending: [], pendingOmitted: 2 ** 31 }) + [...new Set(set.map((k) => k.slice(0, k.indexOf(':'))))].reduce((n, t) => n + bytes(t) + 4, 0);

  it('레코드 수는 적어도 본문이 예산을 넘으면 partial로 줄이고, 저장된 내용은 그대로다(실제 예산 3MB)', async () => {
    const before = stored('block');
    const para = '가'.repeat(30_000); // UTF-8 90KB
    const md = `# Heavy\n\n${Array.from({ length: 40 }, (_, i) => `${i} ${para}`).join('\n\n')}\n`;
    expect(Buffer.byteLength(md)).toBeGreaterThan(imp.IMPORT_RESPONSE_BUDGET);
    const r = await run({ kind: 'private' }, 'Heavy.md', md, 'text/markdown');
    expect(r.status).toBe(200);
    const b = r.body as any;
    const made = stored('block') - before;
    expect(made).toBeGreaterThanOrEqual(41);
    expect(made).toBeLessThan(1000); // 개수 기준으로는 줄지 않았을 가져오기
    expect(b.partial).toBe(true);
    expect(b.pending).toBeUndefined();
    expect(b.pendingOmitted).toBeUndefined();
    expect(bytes(b)).toBeLessThanOrEqual(imp.IMPORT_RESPONSE_BUDGET);
    expect(ids(b, 'block')).toEqual(b.pageIds);
    const root = value(b, 'block', b.pageIds[0]);
    expect(root.content).toHaveLength(40);
    // 본문은 DB에 전부 있다(글자 수까지)
    const kids = db.db.prepare(`SELECT count(*) AS n, min(length(data)) AS shortest FROM records WHERE tbl = 'block' AND id IN (${root.content.map(() => '?').join(',')})`).get(...root.content) as { n: number; shortest: number };
    expect(Number(kids.n)).toBe(40);
    expect(Number(kids.shortest)).toBeGreaterThan(30_000);
  });

  it('예산 안이면 예전과 같은 전체 응답이고, 1바이트만 모자라도 partial 계약(부모·뿌리)으로 바뀐다', async () => {
    const host = await run({ kind: 'private' }, 'ByteHost.md', '# ByteHost\n\n기존 문단\n', 'text/markdown');
    const hostId = (host.body as any).pageIds[0];
    const r = await run({ kind: 'page', pageId: hostId }, 'small-under.zip', exportZip(2, 3, 4));
    const full = r.body as any;
    expect(full.partial).toBeUndefined();
    const target = { table: 'block', id: hostId };
    const same = build(full, target, bytes(full));
    expect(same.partial).toBeUndefined();
    expect(keys(same).sort()).toEqual(keys(full).sort());
    expect(bytes(same)).toBe(bytes(full));

    const cut = build(full, target, bytes(full) - 1);
    expect(cut.partial).toBe(true);
    expect(cut.pending).toBeUndefined();
    expect(keys(cut).sort()).toEqual([`block:${hostId}`, ...full.pageIds.map((id: string) => `block:${id}`)].sort());
    expect(cut.recordMap.block[hostId]).toEqual(full.recordMap.block[hostId]);
    expect({ pageIds: cut.pageIds, pages: cut.pages, databases: cut.databases }).toEqual(baseOf(full));
  });

  it('partial도 예산을 넘으면 못 실은 레코드를 pending 포인터로 돌려준다 — 빠지거나 겹치는 것 없이, 실제 직렬화가 예산 이하', async () => {
    // 뿌리 3개(파일 3개) + 「내 페이지」 목록(space_view): partial 집합이 여러 표·여러 레코드다
    const up = (n: string) => ({ name: `${n}.md`, url: put(`${n}.md`, `# ${n}\n\n${'본문 '.repeat(200 + n.length * 50)}\n`, 'text/markdown').url });
    const r = await runtime.runRpc('importFiles', { spaceId, parent: { kind: 'private' }, files: [up('Alpha'), up('Be'), up('Gamma3')] }, sue);
    expect(r.status).toBe(200);
    const full = r.body as any;
    expect(full.pageIds).toHaveLength(3);
    const target = { table: 'space', id: spaceId };
    const partial = build(full, target, bytes(full) - 1);
    expect(partial.pending).toBeUndefined();
    const set = keys(partial);
    expect(set.filter((k) => k.startsWith('space_view:'))).toHaveLength(1);
    expect(set.filter((k) => k.startsWith('block:')).sort()).toEqual(full.pageIds.map((id: string) => `block:${id}`).sort());
    // 정해진 순서: 블록이 아닌 레코드 → 뿌리(가져온 순서)
    const order = [...set.filter((k) => !k.startsWith('block:')), ...full.pageIds.map((id: string) => `block:${id}`)];

    const floor = floorOf(full, set);
    const top = bytes(partial);
    const seen = { some: 0, none: 0, omitted: 0 };
    // 크기는 넉넉히 어림하므로(선택 칸 자리 포함) 실제 크기보다 조금 큰 예산에서 전부 실린다
    for (let budget = floor; budget <= top + 200; budget += 37) {
      const out = build(full, target, budget);
      const again = build(full, target, budget);
      expect(again, `예산 ${budget}: 같은 입력이면 같은 결과`).toEqual(out);
      expect(out.partial).toBe(true);
      expect(bytes(out), `예산 ${budget}: 실제 직렬화`).toBeLessThanOrEqual(budget);
      const inMap = keys(out);
      const inPending = (out.pending ?? []).map(ptr);
      expect(inMap.filter((k) => inPending.includes(k)), `예산 ${budget}: 겹침`).toEqual([]);
      if (out.pendingOmitted) {
        // 포인터 목록조차 다 못 실었다: 레코드는 싣지 않고, 포인터는 순서의 앞부분만, 나머지는 수로 알린다
        seen.omitted++;
        expect(inMap).toEqual([]);
        expect(inPending).toEqual(order.slice(0, inPending.length));
        expect(inPending.length + out.pendingOmitted).toBe(order.length);
      } else {
        expect([...inMap, ...inPending].sort(), `예산 ${budget}: 합집합`).toEqual([...set].sort());
        // pending은 정해진 순서를 지킨다
        expect(inPending).toEqual(order.filter((k) => inPending.includes(k)));
        // 실린 레코드는 전체 응답의 값과 같다
        for (const k of inMap) expect(out.recordMap[k.slice(0, k.indexOf(':'))][k.slice(k.indexOf(':') + 1)]).toEqual(full.recordMap[k.slice(0, k.indexOf(':'))][k.slice(k.indexOf(':') + 1)]);
        if (inPending.length) seen.some++;
        else seen.none++;
      }
      // 어느 단계든 저장 결과(쪽 id·수)는 같다
      expect({ pageIds: out.pageIds, pages: out.pages, databases: out.databases }).toEqual(baseOf(full));
    }
    expect(seen.omitted).toBeGreaterThan(0);
    expect(seen.some).toBeGreaterThan(0);
    expect(seen.none).toBeGreaterThan(0);

    // 포인터는 다 들어가지만 레코드는 하나도 못 싣는 예산: 전부 pending, 순서 그대로
    const pointersOnly = build(full, target, floor + order.reduce((n, k) => n + pointerBytes(k), 0));
    expect(keys(pointersOnly)).toEqual([]);
    expect(pointersOnly.pending.map(ptr)).toEqual(order);
    expect(pointersOnly.pendingOmitted).toBeUndefined();

    // pending 포인터를 화면이 쓰는 fetchRecords로 받으면 저장된 값이 온다
    const got = await runtime.runRpc('fetchRecords', { requests: pointersOnly.pending.map((p: any) => ({ pointer: p, version: -1 })) }, sue);
    expect(got.status).toBe(200);
    for (const k of order) {
      const [t, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
      expect((got.body as any).recordMap[t][id], k).toEqual(full.recordMap[t][id]);
    }
    // 권한 없는 다른 회원은 같은 포인터로 아무것도 받지 못한다
    const denied = await runtime.runRpc('fetchRecords', { requests: pointersOnly.pending.map((p: any) => ({ pointer: p, version: -1 })) }, tom);
    expect(keys(denied.body as any)).toEqual([]);
  });

  it('레코드 하나가 예산보다 크면 그 레코드만 pending으로 가고, 나머지는 실린다', async () => {
    const host = await run({ kind: 'private' }, 'BigOneHost.md', '# BigOneHost\n\n기존 문단\n', 'text/markdown');
    const hostId = (host.body as any).pageIds[0];
    const r = await run({ kind: 'page', pageId: hostId }, 'BigOne.md', '# BigOne\n\n본문\n', 'text/markdown');
    const full = r.body as any;
    const rootId = full.pageIds[0];
    // 뿌리 레코드만 크게 만든다(제목 60KB) — 저장된 값은 건드리지 않고 응답 구성 입력만 바꾼다
    const changes = changesOf(full).map((ch) => (ch.record.id === rootId ? { ...ch, record: { ...ch.record, properties: { ...ch.record.properties, title: [['큰'.repeat(20_000)]] } } } : ch));
    const budget = 20_000;
    const out = build(full, { table: 'block', id: hostId }, budget, changes);
    expect(out.partial).toBe(true);
    expect(bytes(out)).toBeLessThanOrEqual(budget);
    expect(keys(out)).toEqual([`block:${hostId}`]);
    expect(out.pending).toEqual([{ table: 'block', id: rootId }]);
    expect(out.pendingOmitted).toBeUndefined();
  });

  describe('화면: pending 추가 로드(loadImportPending)', () => {
    const p = (i: number) => ({ table: 'block', id: `id-${i}` });
    const recorder = (fail: (id: string, nth: number) => boolean = () => false) => {
      const calls: string[][] = [];
      const sync = async (pointers: { table: string; id: string }[]) => {
        calls.push(pointers.map((x) => x.id));
        if (fail(pointers[0].id, calls.length)) throw new Error('응답 없음');
      };
      return { calls, sync };
    };

    it('pending이 없으면 아무것도 부르지 않고 「다 올라옴」', async () => {
      const a = recorder();
      expect(await pend.loadImportPending({}, a.sync)).toBe(true);
      expect(await pend.loadImportPending({ pending: [] }, a.sync)).toBe(true);
      expect(a.calls).toEqual([]);
    });

    it('포인터마다 하나씩, 순서대로 한 번만 받는다', async () => {
      const a = recorder();
      expect(await pend.loadImportPending({ pending: [p(1), p(2), p(3)] }, a.sync)).toBe(true);
      expect(a.calls).toEqual([['id-1'], ['id-2'], ['id-3']]);
    });

    it('하나가 실패해도 다시 부르지 않고 나머지를 받은 뒤 「일부 못 올라옴」을 돌려준다(저장 실패가 아니다 — 던지지 않는다)', async () => {
      const a = recorder((id) => id === 'id-2');
      expect(await pend.loadImportPending({ pending: [p(1), p(2), p(3), p(4)] }, a.sync)).toBe(false);
      expect(a.calls).toEqual([['id-1'], ['id-2'], ['id-3'], ['id-4']]);
    });

    it('연달아 실패하면(연결 끊김) 남은 것을 계속 부르지 않는다', async () => {
      const a = recorder(() => true);
      expect(await pend.loadImportPending({ pending: Array.from({ length: 10 }, (_, i) => p(i)) }, a.sync)).toBe(false);
      expect(a.calls).toHaveLength(pend.PENDING_MAX_FAILS_IN_A_ROW);
    });

    it('서버가 포인터도 다 못 실었다고 알리면(pendingOmitted) 받은 포인터는 받고 「일부 못 올라옴」', async () => {
      const a = recorder();
      expect(await pend.loadImportPending({ pending: [p(1)], pendingOmitted: 5 }, a.sync)).toBe(false);
      expect(a.calls).toEqual([['id-1']]);
    });

    it('포인터가 너무 많으면 정한 수까지만 받고 「일부 못 올라옴」, 모양이 틀린 포인터는 건너뛴다', async () => {
      const a = recorder();
      const many = Array.from({ length: pend.PENDING_MAX_REQUESTS + 7 }, (_, i) => p(i));
      expect(await pend.loadImportPending({ pending: many }, a.sync)).toBe(false);
      expect(a.calls).toHaveLength(pend.PENDING_MAX_REQUESTS);
      const b = recorder();
      expect(await pend.loadImportPending({ pending: [null, { table: 'block' }, p(9)] as any }, b.sync)).toBe(true);
      expect(b.calls).toEqual([['id-9']]);
    });
  });
});
