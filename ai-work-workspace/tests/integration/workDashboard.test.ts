// 「📊 업무 현황판」(2026-11-13) 시험 — 로컬 Docker Postgres(aww-pg-test)만 쓴다.
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let db: typeof import('../../src/litpage/server/db.ts');

const amy = { id: '33333333-3333-4333-8333-333333333333', email: 'amy@example.com', name: '에이미' };
const ben = { id: '44444444-4444-4444-8444-444444444444', email: 'ben@example.com', name: '벤' };

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  db = await import('../../src/litpage/server/db.ts');
  for (const m of [amy, ben]) {
    await runtime.runRpc('loadAccountData', {}, m);
    const r = await runtime.runRpc('createWorkspace', { name: `${m.name} 팀` }, m);
    expect(r.status).toBe(200);
  }
});

const kids = (id: string) => (db.getRecord<any>('block', id)?.content ?? []).map((c: string) => db.getRecord<any>('block', c));

describe('업무 현황판', () => {
  let pageId = '';
  it('처음 누르면 캘린더를 먼저 만들고, 캘린더 연결 보기 + 할 일 표가 든 현황판을 「내 페이지」에 만든다', async () => {
    const r = await runtime.runRpc('workInboxDashboard', {}, amy);
    expect(r.status).toBe(200);
    const body = r.body as any;
    expect(body.created).toBe(true);
    pageId = body.pageId;
    const page = db.getRecord<any>('block', pageId);
    expect(page.type).toBe('page');
    expect(page.properties.title[0][0]).toBe('📊 업무 현황판');

    const settings = db.getRecord<any>('user_settings', amy.id).settings;
    const calendar = db.getRecord<any>('block', settings.aww_content_calendar_db);
    expect(calendar.type).toBe('collection_view_page');

    const blocks = kids(pageId);
    const linked = blocks.filter((b: any) => b.type === 'collection_view');
    expect(linked).toHaveLength(2); // 캘린더 연결 보기 + 할 일 표(받은 업무 표는 아직 없음)
    const calView = linked.find((b: any) => b.collection_id === calendar.collection_id);
    expect(calView).toBeTruthy();
    expect(calView.format.collection_pointer.id).toBe(calendar.collection_id);
    // 원래 캘린더의 보기(달력·상태별·전체)를 복사하되 이 블록에 붙는다
    const views = calView.view_ids.map((v: string) => db.getRecord<any>('collection_view', v));
    expect(views.map((v: any) => v.type)).toEqual(['calendar', 'board', 'table']);
    expect(views.every((v: any) => v.parent_id === calView.id && v.format.collection_pointer.id === calendar.collection_id)).toBe(true);
    expect(calView.view_ids).not.toEqual(calendar.view_ids);

    const todo = linked.find((b: any) => b.collection_id !== calendar.collection_id);
    const todoCol = db.getRecord<any>('collection', todo.collection_id);
    expect(todoCol.parent_id).toBe(todo.id);
    expect(Object.values(todoCol.schema).map((p: any) => p.name)).toEqual(['할 일', '상태', '마감일', '우선순위']);

    // 받은 업무 표가 없을 때 안내 문구
    expect(JSON.stringify(blocks.map((b: any) => b.properties?.title))).toContain('아직 받은 업무 표가 없습니다');
    // 「내 페이지」 맨 위
    const acc = await runtime.runRpc('loadAccountData', {}, amy);
    const svIds = Object.keys((acc.body as any).recordMap.space_view ?? {});
    expect(svIds.some((id) => db.getRecord<any>('space_view', id)?.private_pages?.[0] === pageId)).toBe(true);
  });

  it('다시 누르면 같은 현황판을 연다(새로 만들지 않음)', async () => {
    const r = await runtime.runRpc('workInboxDashboard', {}, amy);
    expect((r.body as any).created).toBe(false);
    expect((r.body as any).pageId).toBe(pageId);
  });

  it('다른 회원은 자기 현황판을 따로 가진다', async () => {
    const r = await runtime.runRpc('workInboxDashboard', {}, ben);
    expect((r.body as any).pageId).not.toBe(pageId);
    const benCal = db.getRecord<any>('user_settings', ben.id).settings.aww_content_calendar_db;
    const amyCal = db.getRecord<any>('user_settings', amy.id).settings.aww_content_calendar_db;
    expect(benCal).not.toBe(amyCal);
  });

  it('현황판을 지우면 다음에 새로 만든다', async () => {
    db.putRecord('block', { ...db.getRecord<any>('block', pageId), alive: false });
    const r = await runtime.runRpc('workInboxDashboard', {}, amy);
    expect((r.body as any).created).toBe(true);
    expect((r.body as any).pageId).not.toBe(pageId);
  });

  it('받은 업무 표가 있으면 그 표도 연결 보기로 넣는다', async () => {
    const space = Object.keys(((await runtime.runRpc('loadAccountData', {}, ben)).body as any).recordMap.space)[0];
    const t = await runtime.runRpc('getTemplate', { templateId: 'project-tracker', spaceId: space }, ben);
    const inboxDb = (t.body as any).pageId;
    const st = db.getRecord<any>('user_settings', ben.id);
    db.putRecord('user_settings', { ...st, settings: { ...st.settings, aww_work_inbox_db: inboxDb, aww_work_dashboard: null } });
    const r = await runtime.runRpc('workInboxDashboard', {}, ben);
    expect((r.body as any).created).toBe(true);
    const linked = kids((r.body as any).pageId).filter((b: any) => b.type === 'collection_view');
    expect(linked).toHaveLength(3);
    expect(linked.some((b: any) => b.collection_id === db.getRecord<any>('block', inboxDb).collection_id)).toBe(true);
  });
});
