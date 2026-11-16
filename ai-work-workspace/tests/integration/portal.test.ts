// PLAN-20261117-01 E2 7-3(2026-11-17) 손님 포털 — 로컬 Docker Postgres(aww-pg-test, 격리 시험 DB)만 쓴다.
// 1. 기능 스위치가 꺼져 있으면 모듈을 불러와도 표가 생기지 않고, 회원 요청·손님 조회 모두 DB 전에 「없음」
// 2. 켠 뒤(시험 DB에서만): 만들기는 공유 변경 권한(editor)+공개 게시 정책, 다른 워크스페이스 회원은 불가, 토큰 원문은 DB에 없음
// 3. 손님 화면: 고른 허용 속성만, 멘션·링크 주소 제거, 금지 종류로 바뀐 속성 숨김
// 4. 끄기·새 주소·만료·행 삭제·만든 회원 권한 없음·공개 게시 끔·이용 기간 끝 → 매 요청 닫힘
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let portal: typeof import('../../src/server/portal');
let seed: typeof import('../../src/litpage/server/seed.ts');
let db: typeof import('../../src/litpage/server/db.ts');
const owner = { id: 'a1111111-1111-4111-8111-111111111111', email: 'portal-owner@example.com', name: '포털주인' };
const other = { id: 'a2222222-2222-4222-8222-222222222222', email: 'portal-other@example.com', name: '다른 회원' };
let ownerOk = true;
let space = '';
let col = '';
let row = '';
let live = '';
const uuid = () => crypto.randomUUID();
const tableExists = () => !!(db.db.prepare("SELECT to_regclass('aww_portals') AS t").get() as { t: string | null }).t;
const view = (token: string, ip = '203.0.113.1', now?: number) => portal.portalView(token, ip, now);
const rpc = (name: string, body: unknown, who = owner) => runtime.runRpc(name, body, who);

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  portal = await import('../../src/server/portal');
  seed = await import('../../src/litpage/server/seed.ts');
  db = await import('../../src/litpage/server/db.ts');
  portal.setPortalOwnerCheckForTests(async () => ownerOk);
  space = ((await rpc('createWorkspace', { name: '포털 팀' })).body as any).spaceId;
  await rpc('createWorkspace', { name: '다른 팀' }, other);
  db.withRequestCache(() => {
    const page = seed.createPage({ spaceId: space, userId: owner.id, parentId: space, parentTable: 'space', title: '고객 작업' }).id;
    const blk = uuid(); col = uuid(); row = uuid();
    db.putRecord('block', { id: blk, version: 1, type: 'collection_view_page', collection_id: col, view_ids: [], parent_id: page, parent_table: 'block', alive: true, space_id: space, created_by_id: owner.id } as any);
    db.putRecord('collection', {
      id: col, version: 1, parent_id: blk, parent_table: 'block', alive: true, space_id: space,
      schema: {
        title: { name: '작업', type: 'title' },
        memo: { name: '메모', type: 'text' },
        who: { name: '담당자', type: 'person' },
        cost: { name: '금액', type: 'number' },
        rel: { name: '관련', type: 'relation' },
      },
    } as any);
    db.putRecord('block', {
      id: row, version: 1, type: 'page', parent_id: col, parent_table: 'collection', alive: true, space_id: space, created_by_id: owner.id,
      properties: {
        title: [['로고 디자인 '], ['‣', [['p', 'a3333333-3333-4333-8333-333333333333']]]],
        memo: [['시안 2차 '], ['링크', [['a', 'https://secret.example.com/x']]], [' 완료 '], ['‣', [['u', owner.id]]]],
        who: [['‣', [['u', owner.id]]]],
        cost: [['300000']],
      },
    } as any);
  });
});

describe('기능 스위치 꺼짐(기본)', () => {
  it('모듈을 불러와도 표가 없고, 회원 요청은 404, 손님 조회는 null — 그 뒤에도 표 없음', async () => {
    expect(tableExists()).toBe(false);
    expect((await rpc('portalGet', { rowId: row })).status).toBe(404);
    expect((await rpc('portalSave', { rowId: row, props: ['title'] })).status).toBe(404);
    expect((await rpc('portalOff', { rowId: row })).status).toBe(404);
    expect(await view('x'.repeat(43))).toBeNull();
    expect(tableExists()).toBe(false);
  });
});

describe('켠 뒤(격리 시험 DB)', () => {
  let token = '';
  it('허용 종류만 고를 수 있고, 금지 종류는 골라도 버려짐, 토큰 원문은 DB에 없음', async () => {
    portal.setPortalEnabledForTests(true);
    const g = await rpc('portalGet', { rowId: row });
    expect(g.status).toBe(200);
    expect((g.body as any).choices.map((c: any) => c.id).sort()).toEqual(['cost', 'memo', 'title']);
    const s = await rpc('portalSave', { rowId: row, props: ['title', 'memo', 'cost', 'who', 'rel'], days: 30 });
    expect(s.status).toBe(200);
    token = (s.body as any).token;
    expect(token.length).toBeGreaterThan(40);
    expect((s.body as any).props).toEqual(['title', 'memo', 'cost']);
    const dump = JSON.stringify(db.db.prepare('SELECT * FROM aww_portals').all());
    expect(dump).not.toContain(token);
    // 다시 저장하면 주소는 그대로(원문을 다시 주지 않음)
    expect(((await rpc('portalSave', { rowId: row, props: ['title', 'memo'] })).body as any).token).toBeNull();
  });

  it('다른 워크스페이스 회원은 상태 보기·만들기 모두 거절', async () => {
    expect((await rpc('portalGet', { rowId: row }, other)).status).toBeGreaterThanOrEqual(403);
    expect((await rpc('portalSave', { rowId: row, props: ['title'] }, other)).status).toBeGreaterThanOrEqual(403);
  });

  it('손님 화면: 멘션 빠진 평문 제목·메모(링크 주소 없음), 고르지 않은 속성 없음', async () => {
    const v = await view(token);
    expect(v).not.toBeNull();
    expect(v!.title).toBe('로고 디자인 ');
    expect(v!.fields).toEqual([{ name: '메모', value: '시안 2차 링크 완료 ' }]);
    const raw = JSON.stringify(v);
    expect(raw).not.toContain('secret.example.com');
    expect(raw).not.toContain(owner.id);
    expect(raw).not.toContain('a3333333');
  });

  it('메모 속성 종류가 사람으로 바뀌면 표시 안 함', async () => {
    const c = db.getRecord<any>('collection', col);
    db.putRecord('collection', { ...c, version: c.version + 1, schema: { ...c.schema, memo: { name: '메모', type: 'person' } } } as any);
    expect((await view(token))!.fields).toEqual([]);
    db.putRecord('collection', { ...c, version: c.version + 2 } as any);
  });

  it('만든 회원 이용 기간 끝·공개 게시 꺼짐·만든 회원 권한 없음 → 닫힘, 되돌리면 다시 열림', async () => {
    ownerOk = false;
    expect(await view(token)).toBeNull();
    ownerOk = true;
    const sp = db.getRecord<any>('space', space);
    db.putRecord('space', { ...sp, version: sp.version + 1, disable_public_access: true } as any);
    expect(await view(token)).toBeNull();
    db.putRecord('space', { ...sp, version: sp.version + 2, disable_public_access: false } as any);
    expect(await view(token)).not.toBeNull();
    db.db.prepare('UPDATE aww_portals SET created_by = ? WHERE row_id = ?').run(other.id, row);
    expect(await view(token)).toBeNull();
    db.db.prepare('UPDATE aww_portals SET created_by = ? WHERE row_id = ?').run(owner.id, row);
    expect(await view(token)).not.toBeNull();
  });

  it('다른 워크스페이스 행과 섞인 기록·만료·새 주소·끄기·행 삭제 → 닫힘', async () => {
    db.db.prepare('UPDATE aww_portals SET space_id = ? WHERE row_id = ?').run('other-space', row);
    expect(await view(token)).toBeNull();
    db.db.prepare('UPDATE aww_portals SET space_id = ? WHERE row_id = ?').run(space, row);
    expect(await view(token, '203.0.113.9', Date.now() + 400 * 86_400_000)).toBeNull();
    const r = await rpc('portalSave', { rowId: row, props: ['title'], rotate: true });
    const fresh = (r.body as any).token as string;
    expect(fresh).not.toBe(token);
    expect(await view(token)).toBeNull();
    expect(await view(fresh)).not.toBeNull();
    await rpc('portalOff', { rowId: row });
    expect(await view(fresh)).toBeNull();
    const again = ((await rpc('portalSave', { rowId: row, props: ['title'] })).body as any).token as string;
    expect(await view(again)).not.toBeNull();
    const b = db.getRecord<any>('block', row);
    db.putRecord('block', { ...b, version: b.version + 1, alive: false } as any);
    expect(await view(again)).toBeNull();
    db.putRecord('block', { ...b, version: b.version + 2, alive: true } as any);
    live = again;
  });

  it('같은 IP 분당 30번까지는 열리고 31번째는 닫힘', async () => {
    const now = Date.now();
    for (let i = 0; i < 30; i++) expect(await view(live, '198.51.100.77', now)).not.toBeNull();
    expect(await view(live, '198.51.100.77', now)).toBeNull();
    expect(await view(live, '198.51.100.78', now)).not.toBeNull();
  });

  it('QA009: 기간이 끝난 포털을 다시 켜면 새 주소(1회 표시), 옛 주소는 영구 불가 — 켜진 상태에서 속성만 저장하면 주소 유지', async () => {
    const t1 = ((await rpc('portalSave', { rowId: row, props: ['title'], rotate: true })).body as any).token as string;
    expect(await view(t1)).not.toBeNull();
    // 켜진 상태 일반 저장: 주소 유지(토큰 미반환)
    expect(((await rpc('portalSave', { rowId: row, props: ['title', 'cost'] })).body as any).token).toBeNull();
    expect(await view(t1)).not.toBeNull();
    // 만료시킴 → 다시 켜기(rotate 없이)
    db.db.prepare('UPDATE aww_portals SET expires_time = ? WHERE row_id = ?').run(Date.now() - 1000, row);
    expect(await view(t1)).toBeNull();
    const t2 = ((await rpc('portalSave', { rowId: row, props: ['title'] })).body as any).token as string | null;
    expect(t2).toBeTruthy();
    expect(t2).not.toBe(t1);
    expect(await view(t1)).toBeNull();
    expect(await view(t2!)).not.toBeNull();
  });

  it('QA009: 같은 행을 두 번 연달아 다시 켜도 활성 주소는 하나(두 번째는 새 주소를 받지 않음)', async () => {
    await rpc('portalOff', { rowId: row });
    const [a, b] = await Promise.all([rpc('portalSave', { rowId: row, props: ['title'] }), rpc('portalSave', { rowId: row, props: ['title'] })]);
    const tokens = [(a.body as any).token, (b.body as any).token].filter(Boolean) as string[];
    expect(tokens).toHaveLength(1);
    expect(await view(tokens[0])).not.toBeNull();
    expect((db.db.prepare('SELECT COUNT(*) AS n FROM aww_portals WHERE row_id = ?').get(row) as any).n).toBe(1);
  });
});
