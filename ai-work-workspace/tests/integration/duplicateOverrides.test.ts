// 2026-11-17 WS-20261117-15 — 달력 Alt 끌기 복제: duplicateDatabaseRows의 선택 입력 overrides(복제본 날짜를 같은 트랜잭션에).
// 실제 회원 요청 경로(runRpc)·격리 시험 DB. 원본 불변, 루트 행·날짜 속성·올바른 날짜만, 틀리면 전체 거절·새 행 0, overrides 없으면 기존 복제 그대로.
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let seed: typeof import('../../src/litpage/server/seed.ts');
let db: typeof import('../../src/litpage/server/db.ts');
let values: typeof import('../../src/litpage/shared/database/values.ts');
const owner = { id: 'b1111111-1111-4111-8111-111111111111', email: 'dup-owner@example.com', name: '복제주인' };
const other = { id: 'b2222222-2222-4222-8222-222222222222', email: 'dup-other@example.com', name: '다른 회원' };
const writer = { id: 'b3333333-3333-4333-8333-333333333333', email: 'dup-writer@example.com', name: '쓰기 회원' };
const reader = { id: 'b4444444-4444-4444-8444-444444444444', email: 'dup-reader@example.com', name: '읽기 회원' };
let blkId = '';
let space = '';
let col = '';
let r1 = '';
let r2 = '';
const uuid = () => crypto.randomUUID();
const rpc = (name: string, body: unknown, who = owner) => runtime.runRpc(name, body, who);
const day = (iso: string) => values.encodeDate({ type: 'date', start_date: iso } as never);
const rowCount = () => db.withRequestCache(() => db.childrenOf<any>('block', col).filter((b: any) => b.alive !== false).length);
const dateOf = (id: string) => JSON.stringify(db.getRecord<any>('block', id)?.properties?.when ?? null);

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  seed = await import('../../src/litpage/server/seed.ts');
  db = await import('../../src/litpage/server/db.ts');
  values = await import('../../src/litpage/shared/database/values.ts');
  space = ((await rpc('createWorkspace', { name: '복제 팀' })).body as any).spaceId;
  await rpc('createWorkspace', { name: '다른 팀' }, other);
  db.withRequestCache(() => {
    const page = seed.createPage({ spaceId: space, userId: owner.id, parentId: space, parentTable: 'space', title: '일정' }).id;
    const blk = uuid(); col = uuid(); r1 = uuid(); r2 = uuid(); blkId = blk;
    db.putRecord('block', { id: blk, version: 1, type: 'collection_view_page', collection_id: col, view_ids: [], parent_id: page, parent_table: 'block', alive: true, space_id: space, created_by_id: owner.id,
      permissions: [{ type: 'user_permission', user_id: writer.id, role: 'read_and_write' }, { type: 'user_permission', user_id: reader.id, role: 'reader' }] } as any);
    db.putRecord('collection', { id: col, version: 1, parent_id: blk, parent_table: 'block', alive: true, space_id: space,
      schema: { title: { name: '이름', type: 'title' }, when: { name: '날짜', type: 'date' }, memo: { name: '메모', type: 'text' },
        // 제한 열: 데이터베이스 편집자가 아니면 읽기만(속성 접근 규칙)
        locked: { name: '확정일', type: 'date', property_permissions: { default_access: 'reader', overrides: [] } } } } as any);
    for (const [id, t, d] of [[r1, '강의', '2026-11-17'], [r2, '행사', '2026-11-18']]) {
      db.putRecord('block', { id, version: 1, type: 'page', parent_id: col, parent_table: 'collection', alive: true, space_id: space, created_by_id: owner.id,
        properties: { title: [[t]], when: day(d), memo: [['메모']], locked: day(d) } } as any);
    }
  });
});

describe('Alt 끌기 복제 — overrides', () => {
  it('날짜 덮어쓰기: 복제본은 새 날짜·제목 (1)·메모 그대로, 원본 날짜 불변(한 번의 요청)', async () => {
    const before = rowCount();
    const res = await rpc('duplicateDatabaseRows', { rowIds: [r1], overrides: { [r1]: { when: day('2026-11-24') } } });
    expect(res.status).toBe(200);
    const [copy] = (res.body as any).rowIds as string[];
    expect(rowCount()).toBe(before + 1);
    expect(dateOf(copy)).toContain('2026-11-24');
    expect(dateOf(r1)).toContain('2026-11-17');
    const c = db.getRecord<any>('block', copy);
    expect(JSON.stringify(c.properties.title)).toContain('강의 (1)');
    expect(c.properties.memo).toEqual([['메모']]);
  });

  it('overrides 없으면 기존 복제 그대로(날짜 같음), 여러 행 중 하나만 덮어쓰기', async () => {
    const plain = ((await rpc('duplicateDatabaseRows', { rowIds: [r2] })).body as any).rowIds[0];
    expect(dateOf(plain)).toContain('2026-11-18');
    const two = ((await rpc('duplicateDatabaseRows', { rowIds: [r1, r2], overrides: { [r2]: { when: day('2026-12-01') } } })).body as any).rowIds as string[];
    expect(two).toHaveLength(2);
    expect(dateOf(two[0])).toContain('2026-11-17');
    expect(dateOf(two[1])).toContain('2026-12-01');
  });

  it.each([
    ['복제하지 않는 행', () => ({ rowIds: [r1], overrides: { [r2]: { when: day('2026-11-30') } } }), 400],
    ['날짜가 아닌 속성', () => ({ rowIds: [r1], overrides: { [r1]: { memo: [['바뀜']] } } }), 400],
    ['없는 속성', () => ({ rowIds: [r1], overrides: { [r1]: { nope: day('2026-11-30') } } }), 400],
    ['날짜가 아닌 값', () => ({ rowIds: [r1], overrides: { [r1]: { when: [['내일']] } } }), 400],
    ['배열 overrides', () => ({ rowIds: [r1], overrides: [1] }), 400],
    ['__proto__ 키', () => ({ rowIds: [r1], overrides: JSON.parse('{"__proto__":{"when":[]}}') }), 400],
  ])('%s → 거절, 새 행 0, 원본 불변', async (_n, body, status) => {
    const before = rowCount();
    const res = await rpc('duplicateDatabaseRows', body());
    expect(res.status).toBe(status);
    expect(rowCount()).toBe(before);
    expect(dateOf(r1)).toContain('2026-11-17');
  });

  it('다른 워크스페이스 회원은 덮어쓰기와 함께여도 거절, 새 행 0', async () => {
    const before = rowCount();
    const res = await rpc('duplicateDatabaseRows', { rowIds: [r1], overrides: { [r1]: { when: day('2026-11-25') } } }, other);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(rowCount()).toBe(before);
  });

  it('쓰기 회원(read_and_write)이 읽기만 허용된 제한 날짜 칸을 바꾸려 하면 403·새 행 0·원본 불변', async () => {
    const before = rowCount();
    const res = await rpc('duplicateDatabaseRows', { rowIds: [r1], overrides: { [r1]: { locked: day('2026-11-26') } } }, writer);
    expect(res.status).toBe(403);
    expect(rowCount()).toBe(before);
    expect(JSON.stringify(db.getRecord<any>('block', r1).properties.locked)).toContain('2026-11-17');
  });

  it('읽기 회원: 덮어쓰기 검사는 통과해도 저장 단계(applyTransactions)에서 거절 → 새 행 0', async () => {
    const before = rowCount();
    const res = await rpc('duplicateDatabaseRows', { rowIds: [r1], overrides: { [r1]: { when: day('2026-11-27') } } }, reader);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(rowCount()).toBe(before);
    expect(dateOf(r1)).toContain('2026-11-17');
  });

  // QA011 P2(Mac msg515): 날짜 값을 원형 규격대로 엄격 검사 — 잘못되면 400·새 행 0·원본 불변
  const dv = (v: Record<string, unknown>) => [['‣', [['d', v]]]];
  it.each([
    ['없는 월일 2026-99-99', { type: 'date', start_date: '2026-99-99' }],
    ['2월 30일(넘김 금지)', { type: 'date', start_date: '2026-02-30' }],
    ['평년 2월 29일', { type: 'date', start_date: '2026-02-29' }],
    ['기간 끝 날짜 잘못', { type: 'daterange', start_date: '2026-11-19', end_date: 'bad' }],
    ['기간인데 끝 없음', { type: 'daterange', start_date: '2026-11-19' }],
    ['거꾸로 된 기간', { type: 'daterange', start_date: '2026-11-20', end_date: '2026-11-19' }],
    ['같은 날 끝 시각이 앞섬', { type: 'datetimerange', start_date: '2026-11-20', start_time: '15:00', end_date: '2026-11-20', end_time: '09:00' }],
    ['잘못된 시각 25:00', { type: 'datetime', start_date: '2026-11-20', start_time: '25:00' }],
    ['시간형인데 시각 없음', { type: 'datetime', start_date: '2026-11-20' }],
    ['없는 시간대', { type: 'datetime', start_date: '2026-11-20', start_time: '10:00', time_zone: 'Mars/Base' }],
    ['모르는 종류', { type: 'week', start_date: '2026-11-20' }],
    ['날짜만인데 끝 날짜가 붙음', { type: 'date', start_date: '2026-11-20', end_date: '2026-11-21' }],
  ])('잘못된 날짜(%s) → 400·새 행 0·원본 불변', async (_n, v) => {
    const before = rowCount();
    const res = await rpc('duplicateDatabaseRows', { rowIds: [r1], overrides: { [r1]: { when: dv(v) } } });
    expect(res.status).toBe(400);
    expect(rowCount()).toBe(before);
    expect(dateOf(r1)).toContain('2026-11-17');
  });

  it.each([
    ['날짜만', { type: 'date', start_date: '2028-02-29' }],
    ['시간 있음+시간대', { type: 'datetime', start_date: '2026-11-20', start_time: '09:30', time_zone: 'Asia/Seoul' }],
    ['기간', { type: 'daterange', start_date: '2026-12-31', end_date: '2027-01-02' }],
    ['시간 기간(같은 날 순서 맞음)', { type: 'datetimerange', start_date: '2026-11-20', start_time: '09:00', end_date: '2026-11-20', end_time: '09:00', time_zone: 'America/New_York' }],
  ])('정상 형식(%s)은 그대로 복제', async (_n, v) => {
    const res = await rpc('duplicateDatabaseRows', { rowIds: [r1], overrides: { [r1]: { when: dv(v) } } });
    expect(res.status).toBe(200);
    expect(dateOf((res.body as any).rowIds[0])).toContain(String(v.start_date));
  });
});
