// WS-20261117-24 E3-2 — 템플릿을 쓸 때 앱 알림 자동화 2개를 함께(PLAN 7-11, Master msg_a2a28826de2b). 격리 시험 DB(aww-pg-test)만.
// 실제 runtime.runRpc(getTemplate·applyTemplateToDatabase) → 실제 saveAutomation(같은 ctx) → 행 편집(applyTransactions) → 자동화 엔진 → 앱 알림.
// 외부 발송은 setExternalNotifyHandler로 세기만(0이어야 함). AI·실제 회원·메일·카톡 0.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let dbm: typeof import('../../src/litpage/server/db.ts');
let rec: typeof import('../../src/litpage/server/records.ts');
let engine: typeof import('../../src/litpage/server/automations/engine.ts');
let tpl: typeof import('../../src/litpage/server/api/modules/templates.ts');
let autoMod: typeof import('../../src/litpage/server/api/modules/automations.ts');
let catalog: typeof import('../../src/litpage/server/content/catalog.ts');

const owner = { id: 'd1111111-1111-4111-8111-111111111111', email: 'approval-owner@example.com', name: '결재주인' };
const outsider = { id: 'd2222222-2222-4222-8222-222222222222', email: 'approval-other@example.com', name: '다른 회원' };
const stranger = 'd3333333-3333-4333-8333-333333333333';
const rpc = (name: string, body: unknown, who = owner) => runtime.runRpc(name, body, who);
const external = vi.fn(async () => []);
let space = '';

type Auto = { id: string; alive?: boolean; status: string; created_by_id: string; properties: { name?: string }; trigger: any; actions: any[] };
const automationsOf = (colId: string) => (dbm.childrenOf('automation', colId) as unknown as Auto[]).filter((a) => a.alive !== false);
const notes = (userId: string) => (dbm.db.prepare("SELECT data FROM records WHERE tbl = 'notification'").all() as { data: string }[])
  .map((r) => JSON.parse(r.data)).filter((n) => n.user_id === userId);
const collectionOfPage = (pageId: string) => {
  const ids = dbm.db.prepare("SELECT id FROM records WHERE tbl = 'collection' AND data::jsonb->>'parent_id' = ?").all(pageId) as { id: string }[];
  return ids[0]?.id;
};
const rowsOf = (colId: string) => (dbm.childrenOf('block', colId) as any[]).filter((b) => b.alive !== false && b.parent_table === 'collection');
function setProps(rowId: string, props: Record<string, unknown>) {
  const ops = Object.entries(props).map(([k, v]) => ({ pointer: { table: 'block', id: rowId, spaceId: space }, path: ['properties', k], command: 'set', args: v }));
  rec.applyTransactions(owner.id, [{ id: crypto.randomUUID(), spaceId: space, operations: ops }] as any);
}
const person = (id: string) => [['‣', [['u', id]]]];

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  dbm = await import('../../src/litpage/server/db.ts');
  rec = await import('../../src/litpage/server/records.ts');
  engine = await import('../../src/litpage/server/automations/engine.ts');
  tpl = await import('../../src/litpage/server/api/modules/templates.ts');
  autoMod = await import('../../src/litpage/server/api/modules/automations.ts');
  catalog = await import('../../src/litpage/server/content/catalog.ts');
  engine.setExternalNotifyHandler(external as never);
  space = ((await rpc('createWorkspace', { name: '결재 팀' })).body as any).spaceId;
  await rpc('createWorkspace', { name: '다른 팀' }, outsider);
});
afterAll(() => {
  tpl.setTemplateAutomationSaverForTests(null);
});

describe('E3-2 결재 템플릿 → 앱 알림 자동화 2개', () => {
  let colId = '';
  it('「템플릿 추가」(getTemplate): 새 표에 자동화 2개(활성·만든 사람=사용 회원·대상 속성 일치·외부 발송 없음), 경고 없음', async () => {
    const r = await rpc('getTemplate', { templateId: 'simple-approval', spaceId: space });
    expect(r.status).toBe(200);
    const body = r.body as any;
    expect(body.automationWarnings).toBeUndefined();
    colId = collectionOfPage(body.pageId)!;
    const autos = automationsOf(colId);
    expect(autos.map((a) => a.properties.name).sort()).toEqual(['결재 결과 알림(요청자)', '결재 요청 알림(결재자)']);
    for (const a of autos) {
      expect(a.status).toBe('active');
      expect(a.created_by_id).toBe(owner.id);
      expect(a.trigger.events[0]).toMatchObject({ type: 'property_edited', property: 'aSta' });
      expect(a.actions[0].type).toBe('notify');
      expect(a.actions[0].external ?? []).toEqual([]);
    }
    expect(autos.find((a) => a.properties.name!.includes('결재자'))!.actions[0].target).toEqual({ type: 'property', property: 'aApr' });
    expect(autos.find((a) => a.properties.name!.includes('요청자'))!.actions[0].target).toEqual({ type: 'property', property: 'aReq' });
    expect(Object.keys(body.recordMap.automation ?? {}).length).toBe(2); // 화면이 바로 보도록 응답에도
    // 예시 행: 작성 중·요청자/결재자 비움 → 만든 순간 알림 0
    const rows = rowsOf(colId);
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows[0].properties.aSta)).toContain('작성 중');
    expect(rows[0].properties.aApr ?? null).toBeNull();
    await engine.flushAutomations();
    expect(notes(owner.id)).toHaveLength(0);
  });

  it('상태를 「승인 요청」으로 → 결재자에게 앱 알림 1, 「승인」 → 요청자에게 1, 외부 발송 0', async () => {
    const row = rowsOf(colId)[0];
    setProps(row.id, { aApr: person(owner.id), aReq: person(owner.id) });
    await engine.flushAutomations();
    expect(notes(owner.id)).toHaveLength(0); // 사람만 넣고 상태는 그대로 → 알림 없음
    setProps(row.id, { aSta: [['승인 요청']] });
    await engine.flushAutomations();
    const n1 = notes(owner.id);
    expect(n1).toHaveLength(1);
    expect(n1[0].activity.automation_name).toBe('결재 요청 알림(결재자)');
    setProps(row.id, { aSta: [['승인']] });
    await engine.flushAutomations();
    const n2 = notes(owner.id);
    expect(n2.some((n) => n.activity.automation_name === '결재 결과 알림(요청자)')).toBe(true);
    expect(external).not.toHaveBeenCalled();
  });

  it('결재자가 그 페이지를 열 수 없는 사람이면 알림 0', async () => {
    const r = await rpc('getTemplate', { templateId: 'simple-approval', spaceId: space });
    const col = collectionOfPage((r.body as any).pageId)!;
    const row = rowsOf(col)[0];
    setProps(row.id, { aApr: person(stranger) });
    setProps(row.id, { aSta: [['승인 요청']] });
    await engine.flushAutomations();
    expect(notes(stranger)).toHaveLength(0);
  });

  it('다른 템플릿에는 자동화를 만들지 않음', async () => {
    const r = await rpc('getTemplate', { templateId: 'project-tracker', spaceId: space });
    expect((r.body as any).automationWarnings).toBeUndefined();
    const col = collectionOfPage((r.body as any).pageId)!;
    expect(automationsOf(col)).toHaveLength(0);
  });

  it('워크스페이스 회원이 아니면 기존처럼 거절(템플릿·자동화 0)', async () => {
    const before = (dbm.db.prepare("SELECT COUNT(*)::int AS n FROM records WHERE tbl = 'automation'").get() as { n: number }).n;
    const r = await rpc('getTemplate', { templateId: 'simple-approval', spaceId: space }, outsider);
    expect(r.status).toBe(403);
    expect((dbm.db.prepare("SELECT COUNT(*)::int AS n FROM records WHERE tbl = 'automation'").get() as { n: number }).n).toBe(before);
  });

  it('하나를 못 만들면: 표·성공한 자동화는 남고 실패한 이름만 한국어 경고(오류 원문 0)', async () => {
    tpl.setTemplateAutomationSaverForTests((ctx, body) => {
      if (String(body.automation.name).includes('요청자')) throw new Error('DB exploded at line 42 SELECT secret');
      return (autoMod.handlers.saveAutomation as any)(ctx, body);
    });
    try {
      const r = await rpc('getTemplate', { templateId: 'simple-approval', spaceId: space });
      expect(r.status).toBe(200);
      const body = r.body as any;
      const col = collectionOfPage(body.pageId)!;
      expect(rowsOf(col)).toHaveLength(1);
      expect(automationsOf(col).map((a) => a.properties.name)).toEqual(['결재 요청 알림(결재자)']);
      expect(body.automationWarnings).toHaveLength(1);
      expect(body.automationWarnings[0]).toContain('결재 결과 알림(요청자)');
      expect(JSON.stringify(body.automationWarnings)).not.toMatch(/exploded|SELECT|secret|at line|Error/);
    } finally {
      tpl.setTemplateAutomationSaverForTests(null);
    }
  });

  it('같은 이름: 내용이 같으면 이미 만든 것으로 보고, 다르면 덮어쓰지 않고 경고', async () => {
    const def = catalog.TEMPLATES.find((t) => t.id === 'simple-approval')!;
    const orig = def.automations!;
    const first = orig[0];
    def.automations = [
      ...orig,
      { ...first }, // 같은 이름·같은 내용 → 조용히 건너뜀
      { ...first, actions: [{ ...first.actions[0], message: [{ type: 'text', text: '다른 문구' }] } as never] }, // 같은 이름·다른 내용 → 경고
    ];
    try {
      const r = await rpc('getTemplate', { templateId: 'simple-approval', spaceId: space });
      const body = r.body as any;
      const col = collectionOfPage(body.pageId)!;
      const autos = automationsOf(col);
      expect(autos).toHaveLength(2); // 표당 최대 2
      const kept = autos.find((a) => a.properties.name === first.name)!;
      expect(JSON.stringify(kept.actions[0].message)).not.toContain('다른 문구'); // 덮어쓰지 않음
      expect(body.automationWarnings).toHaveLength(1);
      expect(body.automationWarnings[0]).toContain('같은 이름의 다른 자동화');
    } finally {
      def.automations = orig;
    }
  });

  it('「빈 표에 적용」(applyTemplateToDatabase)도 같은 결과, 같은 표에 다시 적용은 거절(자동화는 2개 그대로)', async () => {
    const pageId = crypto.randomUUID();
    const emptyCol = crypto.randomUUID();
    dbm.withRequestCache(() => {
      dbm.putRecord('block', { id: pageId, version: 1, type: 'collection_view_page', collection_id: emptyCol, view_ids: [], parent_id: space, parent_table: 'space', alive: true, space_id: space, created_by_id: owner.id, permissions: [{ type: 'user_permission', role: 'editor', user_id: owner.id }] } as any);
      dbm.putRecord('collection', { id: emptyCol, version: 1, parent_id: pageId, parent_table: 'block', alive: true, space_id: space, schema: { title: { name: '이름', type: 'title' } } } as any);
    });
    const r = await rpc('applyTemplateToDatabase', { templateId: 'simple-approval', blockId: pageId });
    expect(r.status).toBe(200);
    const body = r.body as any;
    expect(body.automationWarnings).toBeUndefined();
    expect(automationsOf(body.collectionId)).toHaveLength(2);
    const again = await rpc('applyTemplateToDatabase', { templateId: 'simple-approval', blockId: pageId });
    expect(again.status).toBe(400);
    expect(automationsOf(body.collectionId)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------- QA033 P2(Mac msg_a9c2574739fa): 같은 이름 비교는 실행에 영향 주는 값을 모두 본다
describe('QA033: 같은 이름 자동화 — 실행 효과가 다르면 같은 것으로 보지 않음', () => {
  async function withExtra(extra: (first: any) => any) {
    const def = catalog.TEMPLATES.find((t) => t.id === 'simple-approval')!;
    const orig = def.automations!;
    def.automations = [...orig, extra(orig[0])];
    try {
      const r = await rpc('getTemplate', { templateId: 'simple-approval', spaceId: space });
      const body = r.body as any;
      return { body, autos: automationsOf(collectionOfPage(body.pageId)!), first: orig[0] };
    } finally {
      def.automations = orig;
    }
  }
  it.each([
    ['외부 발송(external)만 다름', (f: any) => ({ ...f, actions: [{ ...f.actions[0], external: ['email'] }] })],
    ['조건 묶음 방식(trigger.mode)만 다름', (f: any) => ({ ...f, trigger: { ...f.trigger, mode: 'all' } })],
    ['조건 값만 다름', (f: any) => ({ ...f, trigger: { ...f.trigger, events: [{ ...f.trigger.events[0], condition: { op: 'is', values: ['반려'] } }] } })],
    ['알림 대상 속성만 다름', (f: any) => ({ ...f, actions: [{ ...f.actions[0], target: { type: 'property', property: 'aReq' } }] })],
  ])('%s → 저장 0·기존 규칙 그대로·경고 1', async (_n, extra) => {
    const { body, autos, first } = await withExtra(extra);
    expect(autos).toHaveLength(2);
    const kept = autos.find((a) => a.properties.name === first.name)!;
    expect(kept.actions[0].external ?? []).toEqual([]);
    expect(kept.trigger.mode).toBe('any');
    expect(body.automationWarnings).toHaveLength(1);
    expect(body.automationWarnings[0]).toContain('같은 이름의 다른 자동화');
  });
  it('id만 다르고 실행 효과가 같으면 이미 만든 것으로(경고 0·저장 0)', async () => {
    const { body, autos } = await withExtra((f) => ({ ...f, trigger: { ...f.trigger, events: [{ ...f.trigger.events[0], id: 'other-ev' }] }, actions: [{ ...f.actions[0], id: 'other-ac' }] }));
    expect(autos).toHaveLength(2);
    expect(body.automationWarnings).toBeUndefined();
  });
});

// ---------------------------------------------------------------- QA033 잔여 P2(Mac msg_8822a8367bf2): 실제 대상을 가리키는 id는 지우지 않는다
describe('QA033 잔여: 같은 내용 비교 — 의미 있는 id 보존', () => {
  const shape = (t: unknown, a: unknown, st: unknown = 'active') => tpl.automationShapeForTests(t, a, st);
  const trig = (evId = 'ev1') => ({ type: 'event', mode: 'any', events: [{ id: evId, type: 'property_edited', property: 'aSta', condition: { op: 'is', values: ['승인 요청'] } }] });
  const notify = (id: string, message: unknown[], extra: Record<string, unknown> = {}) => ({ id, type: 'notify', target: { type: 'property', property: 'aApr' }, message, ...extra });

  it.each([
    ['알림 문구 속 사용자', [{ type: 'user', id: 'user-A' }], [{ type: 'user', id: 'user-B' }]],
    ['알림 문구 속 페이지', [{ type: 'page', id: 'page-1' }], [{ type: 'page', id: 'page-2' }]],
  ])('%s id가 다르면 다른 것으로', (_n, m1, m2) => {
    expect(shape(trig(), [notify('a1', m1)])).not.toBe(shape(trig(), [notify('a1', m2)]));
  });

  it('알림 대상 사용자 id가 다르면 다른 것으로', () => {
    const a = { id: 'a1', type: 'notify', target: { type: 'users', user_ids: ['user-A'] }, message: [] };
    const b = { id: 'a1', type: 'notify', target: { type: 'users', user_ids: ['user-B'] }, message: [] };
    expect(shape(trig(), [a])).not.toBe(shape(trig(), [b]));
  });

  it('참조 없는 조건·동작의 번호(id)만 다르면 같은 것으로(회귀)', () => {
    expect(shape(trig('ev1'), [notify('a1', [{ type: 'text', text: 'x' }])])).toBe(shape(trig('ev9'), [notify('a9', [{ type: 'text', text: 'x' }])]));
  });

  it('동작끼리 번호로 연결(step·variable)되면 번호가 다를 때 같다고 단정하지 않음(보수적으로 다름)', () => {
    const one = [notify('s1', [{ type: 'text', text: 'x' }]), notify('s2', [{ type: 'step', step: 's1' }])];
    const two = [notify('t1', [{ type: 'text', text: 'x' }]), notify('t2', [{ type: 'step', step: 't1' }])];
    expect(shape(trig(), one)).not.toBe(shape(trig(), two));
    const v1 = [{ id: 'd1', type: 'define_variables', variables: [{ id: 'v', name: 'n', formula: '1' }] }, notify('n1', [{ type: 'variable', step: 'd1', variable: 'v' }])];
    const v2 = [{ id: 'd2', type: 'define_variables', variables: [{ id: 'v', name: 'n', formula: '1' }] }, notify('n1', [{ type: 'variable', step: 'd2', variable: 'v' }])];
    expect(shape(trig(), v1)).not.toBe(shape(trig(), v2));
  });

  it('회귀: external·mode·값 종류·배열 순서·켜짐 상태 차이는 계속 다름', () => {
    const base = [notify('a1', [{ type: 'text', text: 'x' }])];
    expect(shape(trig(), base)).not.toBe(shape(trig(), [notify('a1', [{ type: 'text', text: 'x' }], { external: ['email'] })]));
    expect(shape(trig(), base)).not.toBe(shape({ ...trig(), mode: 'all' }, base));
    expect(shape(trig(), [notify('a1', [{ type: 'text', text: '1' }])])).not.toBe(shape(trig(), [notify('a1', [{ type: 'text', text: 1 }])]));
    const two = [notify('a1', [{ type: 'text', text: 'x' }]), notify('a2', [{ type: 'text', text: 'y' }])];
    expect(shape(trig(), two)).not.toBe(shape(trig(), [two[1], two[0]]));
    expect(shape(trig(), base, 'active')).not.toBe(shape(trig(), base, 'paused'));
  });
});
