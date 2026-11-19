// 버전 기록(스냅숏)의 경계 — WS-20261119-03 D, Master msg_81884a8c4c54.
// 예전에는 블록을 저장할 때마다 스냅숏을 판단해서, 부모가 아직 저장되지 않은 블록(자식부터 쓰는 가져오기·붙여넣기)은 자기 id가
// 「쪽」으로 잡혀 snapshots에 일반 블록 id 줄이 생겼다. 지금은 모든 레코드를 저장한 뒤 실제 쪽(페이지·전체 페이지 데이터베이스·
// 데이터베이스 행)과 그 데이터베이스를 보여 주는 쪽만 쪽마다 한 번 처리한다. 10분 간격·작성자 규칙은 그대로다.
// 로컬 전용 fixture만 쓴다(AWW_LOCAL_ADMIN_URL·AWW_LOCAL_APP_URL).
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let d: typeof import('../../src/litpage/server/db.ts');
let records: typeof import('../../src/litpage/server/records.ts');
let history: typeof import('../../src/litpage/server/history.ts');
let files: typeof import('../../src/litpage/server/content/files.ts');
let zip: typeof import('../../src/litpage/server/content/zip.ts');

const ann = { id: '44444444-4444-4444-8444-444444444444', email: 'snap-ann@example.com', name: '앤' };
const bob = { id: '33333333-3333-4333-8333-333333333333', email: 'snap-bob@example.com', name: '밥' };
let spaceId = '';
let n = 0;
const uid = () => `00000000-0000-4000-a000-${String(++n).padStart(12, '0')}`;
const MIN = 60_000;
const failNext = { on: false };

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  d = await import('../../src/litpage/server/db.ts');
  records = await import('../../src/litpage/server/records.ts');
  history = await import('../../src/litpage/server/history.ts');
  files = await import('../../src/litpage/server/content/files.ts');
  zip = await import('../../src/litpage/server/content/zip.ts');
  for (const m of [ann, bob]) await runtime.runRpc('loadAccountData', {}, m);
  const r = await runtime.runRpc('createWorkspace', { name: '버전 기록' }, ann);
  spaceId = (r.body as any).spaceId ?? (r.body as any).space?.id ?? (r.body as any).id;
  expect(spaceId).toBeTruthy();
  // 실패 주입용: 스위치가 켜진 쓰기는 저장 직전(같은 트랜잭션 안)에서 실패한다
  records.onBeforePersist(() => { if (failNext.on) throw new Error('실패 주입'); });
});

type Snap = { page_id: string; created_time: number; authors: string[]; blocks: any[] };
const q = <T = any>(sql: string, ...params: unknown[]) => d.db.prepare(sql).all(...params) as T[];
const snapsOf = (pageId: string): Snap[] => q<any>('SELECT page_id, created_time, author_ids, data FROM snapshots WHERE page_id = ? ORDER BY created_time', pageId)
  .map((r) => ({ page_id: r.page_id, created_time: Number(r.created_time), authors: JSON.parse(r.author_ids || '[]'), blocks: JSON.parse(r.data).blocks ?? [] }));
/** snapshots.page_id가 가리키는 블록 종류별 줄 수 — 쪽이 아닌 것은 'block:<type>' */
function snapshotKinds() {
  const out: Record<string, number> = {};
  for (const r of q<{ page_id: string }>('SELECT page_id FROM snapshots')) {
    const b = d.withRequestCache(() => d.getRecord('block', r.page_id)) as any;
    const kind = !b ? '(없음)' : b.type === 'page' || b.type === 'collection_view_page' || b.parent_table === 'collection' ? 'page' : `block:${b.type}`;
    out[kind] = (out[kind] ?? 0) + 1;
  }
  return out;
}
const nonPageSnapshots = () => Object.entries(snapshotKinds()).filter(([k]) => k !== 'page');
/** 이 쪽의 기존 스냅숏 시각을 과거로 옮긴다(10분 간격을 넘긴 것처럼) */
const age = (pageId: string, ms = 11 * MIN) => d.db.prepare('UPDATE snapshots SET created_time = created_time - ? WHERE page_id = ?').run(ms, pageId);

const page = (id: string, title: string, extra: Record<string, unknown> = {}) => ({ id, version: 1, type: 'page', space_id: spaceId, parent_id: spaceId, parent_table: 'space', alive: true, content: [], properties: { title: [[title]] }, permissions: [{ type: 'user_permission', role: 'editor', user_id: ann.id }, { type: 'user_permission', role: 'editor', user_id: bob.id }], ...extra }) as any;
const newPage = (title: string) => { const id = uid(); d.putRecord('block', page(id, title)); return id; };
const setOp = (id: string, parent: string, type: string, title: string, extra: Record<string, unknown> = {}) => ({ pointer: { table: 'block', id, spaceId }, path: [], command: 'set', args: { id, type, space_id: spaceId, parent_id: parent, parent_table: 'block', alive: true, properties: { title: [[title]] }, ...extra } });
const listAfter = (parent: string, id: string) => ({ pointer: { table: 'block', id: parent, spaceId }, path: ['content'], command: 'listAfter', args: { id } });
const listRemove = (parent: string, id: string) => ({ pointer: { table: 'block', id: parent, spaceId }, path: ['content'], command: 'listRemove', args: { id } });
const update = (id: string, args: Record<string, unknown>) => ({ pointer: { table: 'block', id, spaceId }, path: [], command: 'update', args });
const titleOp = (id: string, title: string) => ({ pointer: { table: 'block', id, spaceId }, path: ['properties', 'title'], command: 'set', args: [[title]] });
const apply = (who: typeof ann, ops: unknown[]) => d.withRequestCache(() => records.applyTransactions(who.id, [{ id: uid(), spaceId, operations: ops as any }]));
const addText = (who: typeof ann, pageId: string, title: string) => { const id = uid(); apply(who, [setOp(id, pageId, 'text', title), listAfter(pageId, id)]); return id; };

describe('버전 기록은 쪽 단위로만 생긴다', () => {
  it('자식부터 쓰는 쓰기: 쪽 스냅숏 하나만 생기고, 저장이 끝난 내용이 모두 들어 있다', () => {
    const p = newPage('자식 먼저');
    const toggle = uid();
    const kids = [uid(), uid(), uid()];
    apply(ann, [...kids.map((k, i) => setOp(k, toggle, 'text', `문단 ${i}`)), setOp(toggle, p, 'toggle', '토글', { content: kids }), listAfter(p, toggle)]);
    const snaps = snapsOf(p);
    expect(snaps).toHaveLength(1);
    expect(snaps[0].authors).toEqual([ann.id]);
    expect(snaps[0].blocks.map((b) => b.id).sort()).toEqual([p, toggle, ...kids].sort());
    for (const id of [toggle, ...kids]) expect(snapsOf(id)).toHaveLength(0);
    expect(nonPageSnapshots()).toEqual([]);
  });

  it('부모를 확인할 수 없는 블록(부모 없음·맨 위가 쪽이 아님)은 스냅숏을 만들지 않는다', () => {
    const orphan = { id: uid(), version: 1, type: 'text', space_id: spaceId, parent_id: uid(), parent_table: 'block', alive: true, properties: { title: [['고아']] } } as any;
    const loose = { id: uid(), version: 1, type: 'text', space_id: spaceId, parent_id: spaceId, parent_table: 'space', alive: true, properties: { title: [['쪽 아님']] } } as any;
    d.putRecord('block', orphan);
    d.putRecord('block', loose);
    const before = q('SELECT count(*) AS n FROM snapshots')[0].n;
    d.withRequestCache(() => {
      history.snapshotChanged([orphan, loose], ann.id, Date.now());
      history.maybeSnapshot(orphan, ann.id, Date.now());
    });
    expect(q('SELECT count(*) AS n FROM snapshots')[0].n).toBe(before);
    expect(nonPageSnapshots()).toEqual([]);
  });

  it('10분 간격: 간격 안의 쓰기는 새 스냅숏을 만들지 않고, 간격이 지나면 하나 만든다', () => {
    const p = newPage('간격');
    addText(ann, p, '첫 줄');
    expect(snapsOf(p)).toHaveLength(1);
    addText(ann, p, '둘째 줄');
    addText(ann, p, '셋째 줄');
    expect(snapsOf(p)).toHaveLength(1);
    age(p, 9 * MIN);
    addText(ann, p, '아직 9분');
    expect(snapsOf(p)).toHaveLength(1);
    age(p, 2 * MIN);
    addText(ann, p, '11분 뒤');
    expect(snapsOf(p)).toHaveLength(2);
  });

  it('한 번의 쓰기가 같은 쪽의 블록을 여러 개 바꿔도 그 쪽은 한 번만 처리한다', () => {
    const p = newPage('중복 제거');
    const ids = Array.from({ length: 12 }, () => uid());
    apply(ann, ids.flatMap((id, i) => [setOp(id, p, 'text', `줄 ${i}`), listAfter(p, id)]));
    expect(snapsOf(p)).toHaveLength(1);
    expect(snapsOf(p)[0].blocks).toHaveLength(13);
  });

  it('작성자: 간격 안에 쓴 사람들이 다음 스냅숏에 함께 적힌다', () => {
    const p = newPage('작성자');
    addText(ann, p, '앤의 첫 줄');
    expect(snapsOf(p).map((s) => s.authors)).toEqual([[ann.id]]);
    addText(bob, p, '밥의 줄');
    addText(ann, p, '앤의 줄');
    expect(snapsOf(p)).toHaveLength(1);
    age(p);
    addText(ann, p, '간격 뒤');
    const snaps = snapsOf(p);
    expect(snaps).toHaveLength(2);
    expect([...snaps[1].authors].sort()).toEqual([ann.id, bob.id].sort());
  });

  it('되돌려진 쓰기: 스냅숏도 생기지 않고, 그 사람은 대기 작성자에 남지 않는다', () => {
    const p = newPage('되돌리기 1');
    addText(ann, p, '앤의 첫 줄');
    failNext.on = true;
    try {
      expect(() => addText(bob, p, '실패할 줄')).toThrow('실패 주입');
    } finally { failNext.on = false; }
    age(p);
    addText(ann, p, '간격 뒤');
    const snaps = snapsOf(p);
    expect(snaps).toHaveLength(2);
    expect(snaps[1].authors).toEqual([ann.id]);
  });

  it('바깥 트랜잭션이 되돌려지면 안에서 찍힌 스냅숏이 사라지고, 그 전의 대기 작성자가 되살아난다', () => {
    const p = newPage('되돌리기 2');
    addText(ann, p, '앤의 첫 줄');
    addText(bob, p, '밥의 줄'); // 간격 안 — 밥이 대기 작성자로 남는다
    age(p);
    // 간격이 지난 뒤의 쓰기: 안쪽에서 스냅숏이 찍히고(대기 작성자가 비워지고) 바깥에서 실패한다
    expect(() => d.withRequestCache(() => d.tx(() => {
      const id = uid();
      records.applyTransactions(ann.id, [{ id: uid(), spaceId, operations: [setOp(id, p, 'text', '되돌려질 줄'), listAfter(p, id)] as any }]);
      expect(q('SELECT count(*) AS n FROM snapshots WHERE page_id = ?', p)[0].n).toBe(2); // 트랜잭션 안에서는 찍혀 있다
      throw new Error('바깥 실패');
    }))).toThrow('바깥 실패');
    expect(snapsOf(p)).toHaveLength(1);
    addText(ann, p, '다시 쓴 줄'); // 여전히 간격이 지난 상태 → 스냅숏
    const snaps = snapsOf(p);
    expect(snaps).toHaveLength(2);
    expect([...snaps[1].authors].sort()).toEqual([ann.id, bob.id].sort()); // 밥이 사라지지 않았다
    expect(snaps[1].blocks.map((b) => b.properties?.title?.[0]?.[0])).not.toContain('되돌려질 줄');
  });

  it('겹친 트랜잭션에서 같은 쪽을 두 번 써도 스냅숏은 간격 규칙대로 하나다', () => {
    const p = newPage('겹침');
    d.withRequestCache(() => d.tx(() => {
      for (const t of ['하나', '둘']) {
        const id = uid();
        records.applyTransactions(ann.id, [{ id: uid(), spaceId, operations: [setOp(id, p, 'text', t), listAfter(p, id)] as any }]);
      }
    }));
    expect(snapsOf(p)).toHaveLength(1);
    expect(nonPageSnapshots()).toEqual([]);
  });

  it('블록을 다른 쪽으로 옮기면 두 쪽 모두 처리되고, 옮긴 블록 id로는 생기지 않는다', () => {
    const [from, to] = [newPage('출발'), newPage('도착')];
    const x = addText(ann, from, '옮길 줄');
    addText(ann, to, '도착 쪽의 줄');
    age(from);
    age(to);
    apply(ann, [update(x, { parent_id: to }), listRemove(from, x), listAfter(to, x)]);
    expect(snapsOf(from)).toHaveLength(2);
    expect(snapsOf(to)).toHaveLength(2);
    expect(snapsOf(x)).toHaveLength(0);
    expect(snapsOf(from)[1].blocks.map((b) => b.id)).not.toContain(x);
    expect(snapsOf(to)[1].blocks.map((b) => b.id)).toContain(x);
  });

  it('블록 삭제와 쪽 삭제도 쪽 id로만 처리된다', () => {
    const p = newPage('삭제');
    const x = addText(ann, p, '지울 줄');
    age(p);
    apply(ann, [update(x, { alive: false }), listRemove(p, x)]);
    expect(snapsOf(p)).toHaveLength(2);
    expect(snapsOf(x)).toHaveLength(0);
    age(p);
    apply(ann, [update(p, { alive: false })]);
    expect(snapsOf(p)).toHaveLength(3);
    expect(nonPageSnapshots()).toEqual([]);
  });

  it('데이터베이스 행을 고치면 그 행(자기 쪽)과 데이터베이스를 보여 주는 쪽이 처리된다 — 전체 페이지 데이터베이스', async () => {
    const up = d.withRequestCache(() => files.storeFile('Rows.csv', 'Name,Status\nOne,Open\nTwo,Done\n', ann.id, spaceId, 'text/csv'));
    const made = await runtime.runRpc('importFiles', { spaceId, parent: { kind: 'private' }, files: [{ name: 'Rows.csv', url: up.url }] }, ann);
    expect(made.status).toBe(200);
    const dbPage = (made.body as any).pageIds[0] as string;
    const col = (d.withRequestCache(() => d.getRecord('block', dbPage)) as any).collection_id as string;
    const rows = q<{ id: string }>("SELECT id FROM records WHERE tbl = 'block' AND parent_id = ? AND parent_table = 'collection'", col).map((r) => r.id);
    expect(rows).toHaveLength(2);
    // 가져오기 직후: 데이터베이스 쪽 하나, 행마다 하나 — 그 밖의 id는 없다
    expect(snapsOf(dbPage)).toHaveLength(1);
    for (const r of rows) expect(snapsOf(r)).toHaveLength(1);
    expect(nonPageSnapshots()).toEqual([]);
    for (const id of [dbPage, ...rows]) age(id);
    apply(ann, [titleOp(rows[0], 'One 수정')]);
    expect(snapsOf(rows[0])).toHaveLength(2);
    expect(snapsOf(dbPage)).toHaveLength(2);
    expect(snapsOf(rows[1])).toHaveLength(1);
  });

  it('쪽 안에 넣은(인라인) 데이터베이스의 행을 고치면 그 데이터베이스가 놓인 쪽이 처리된다(데이터베이스 블록 id가 아니라)', () => {
    const p = newPage('인라인 호스트');
    const [view, col, row] = [uid(), uid(), uid()];
    d.putRecord('block', { id: view, version: 1, type: 'collection_view', space_id: spaceId, parent_id: p, parent_table: 'block', alive: true, collection_id: col, view_ids: [] } as any);
    d.putRecord('block', { ...page(p, '인라인 호스트'), content: [view] });
    d.putRecord('collection', { id: col, version: 1, space_id: spaceId, parent_id: view, parent_table: 'block', alive: true, name: [['표']], schema: { title: { name: 'Name', type: 'title' } } } as any);
    d.putRecord('block', { id: row, version: 1, type: 'page', space_id: spaceId, parent_id: col, parent_table: 'collection', alive: true, properties: { title: [['행']] } } as any);
    apply(ann, [titleOp(row, '행 수정')]);
    expect(snapsOf(row)).toHaveLength(1);
    expect(snapsOf(p)).toHaveLength(1);
    expect(snapsOf(view)).toHaveLength(0);
    expect(nonPageSnapshots()).toEqual([]);
  });

  it('가져오기(자식부터 씀): 쪽마다 하나씩만 생긴다', async () => {
    const before = q('SELECT count(*) AS n FROM snapshots')[0].n;
    const h = (i: number) => i.toString(16).padStart(32, '0');
    const buf = zip.writeZip([
      { name: `Top ${h(1)}.md`, data: `# Top\n\n문단 하나\n\n- 목록\n- 목록 둘\n\n[Sub](Top%20${h(1)}/Sub%20${h(2)}.md)\n` },
      { name: `Top ${h(1)}/Sub ${h(2)}.md`, data: '# Sub\n\n## 소제목\n\n하위 본문\n\n> 인용\n' },
      { name: `Top ${h(1)}/Loose ${h(3)}.md`, data: '# Loose\n\n1. 하나\n2. 둘\n' },
    ]);
    const up = d.withRequestCache(() => files.storeFile('three.zip', buf, ann.id, spaceId, 'application/zip'));
    const r = await runtime.runRpc('importFiles', { spaceId, parent: { kind: 'private' }, files: [{ name: 'three.zip', url: up.url }] }, ann);
    expect(r.status).toBe(200);
    const made = Object.values((r.body as any).recordMap.block as Record<string, any>).map((x) => x.value.value);
    const pages = made.filter((b) => b.type === 'page');
    expect(pages.length).toBe(3);
    expect(made.length).toBeGreaterThan(pages.length + 5);
    expect(q('SELECT count(*) AS n FROM snapshots')[0].n - before).toBe(3);
    for (const p of pages) expect(snapsOf(p.id)).toHaveLength(1);
    expect(nonPageSnapshots()).toEqual([]);
  });

  it('버전 기록 목록과 복원이 예전처럼 동작한다', async () => {
    const p = newPage('복원');
    const keep = addText(ann, p, '처음부터 있던 줄');
    const first = snapsOf(p);
    expect(first).toHaveLength(1);
    age(p);
    const later = addText(ann, p, '나중에 더한 줄');
    expect(snapsOf(p)).toHaveLength(2);
    const list = await runtime.runRpc('listPageVersions', { pageId: p }, ann);
    expect(list.status).toBe(200);
    const versions = (list.body as any).snapshots as { id: string; createdTime: number; authorIds: string[] }[];
    expect(versions).toHaveLength(2);
    expect(versions.every((v) => v.authorIds.includes(ann.id))).toBe(true);
    const oldest = versions[versions.length - 1];
    age(p);
    const restored = await runtime.runRpc('restoreVersion', { snapshotId: oldest.id }, ann);
    expect({ status: restored.status, message: (restored.body as any)?.message }).toEqual({ status: 200, message: undefined });
    const now = d.withRequestCache(() => d.getRecord('block', p)) as any;
    expect(now.content).toContain(keep);
    expect(now.content).not.toContain(later);
    expect(snapsOf(p).length).toBeGreaterThanOrEqual(3);
    expect(snapsOf(later)).toHaveLength(0);
    expect(nonPageSnapshots()).toEqual([]);
  });
});
