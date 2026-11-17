// WS-20261117-24 E3-3 — 결재자 전용 승인(Master msg_7cb36f10c967 안 A, msg_de5df14ea733). 격리 시험 DB(aww-pg-test)만.
// 기존 속성 접근 규칙(propertyAccess.ts)·서버 검사(dbaccess.ts) 그대로 — 새 권한 엔진·API 0. 실제 쓰기 경로로 확인:
//   화면 저장(runRpc applyChanges, client) · 공개 API(PATCH /v1/pages/:id, 개인 토큰) · AI 비서/버튼과 같은 client 거래(applyTransactions client)
// 회원 4명: 주인(표 전체 권한) · 요청자·결재자·제3자(그 페이지 일반 편집 read_and_write). 실제 회원·메일·카톡·AI 0.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let dbm: typeof import('../../src/litpage/server/db.ts');
let rec: typeof import('../../src/litpage/server/records.ts');
let engine: typeof import('../../src/litpage/server/automations/engine.ts');
let catalog: typeof import('../../src/litpage/server/content/catalog.ts');
let spec: typeof import('../../src/litpage/server/content/spec.ts');

const owner = { id: 'e1111111-1111-4111-8111-111111111111', email: 'perm-owner@example.com', name: '표주인' };
const requester = { id: 'e2222222-2222-4222-8222-222222222222', email: 'perm-req@example.com', name: '요청자' };
const approver = { id: 'e3333333-3333-4333-8333-333333333333', email: 'perm-apr@example.com', name: '결재자' };
const third = { id: 'e4444444-4444-4444-8444-444444444444', email: 'perm-third@example.com', name: '제3자' };
type Who = typeof owner;
const rpc = (name: string, body: unknown, who: Who = owner) => runtime.runRpc(name, body, who);
const external = vi.fn(async () => []);
const person = (id: string) => [['‣', [['u', id]]]];
let space = '';
let root = '';
let col = '';

const getRow = (id: string) => dbm.withRequestCache(() => dbm.getRecord<any>('block', id));
const prop = (id: string, pid: string) => JSON.stringify(getRow(id)?.properties?.[pid] ?? null);
const rowsOf = (colId: string) => dbm.withRequestCache(() => (dbm.childrenOf('block', colId) as any[]).filter((b) => b.alive !== false && b.parent_table === 'collection'));
const colOf = (id: string) => dbm.withRequestCache(() => dbm.getRecord<any>('collection', id));
const notes = (userId: string) => (dbm.db.prepare("SELECT data FROM records WHERE tbl = 'notification'").all() as { data: string }[])
  .map((r) => JSON.parse(r.data)).filter((n) => n.user_id === userId);
const collectionOfPage = (pageId: string) =>
  (dbm.db.prepare("SELECT id FROM records WHERE tbl = 'collection' AND data::jsonb->>'parent_id' = ?").all(pageId) as { id: string }[])[0]?.id;
const countRecords = (tbl: string) => (dbm.db.prepare('SELECT count(*)::int AS n FROM records WHERE tbl = ?').get(tbl) as { n: number }).n;

const setOps = (rowId: string, props: Record<string, unknown>) =>
  Object.entries(props).map(([k, v]) => ({ pointer: { table: 'block', id: rowId, spaceId: space }, path: ['properties', k], command: 'set', args: v }));
/** 화면 저장 경로(실제 회원 요청): 성공 200, 거절은 4xx */
const uiSet = (who: Who, rowId: string, props: Record<string, unknown>) =>
  rpc('applyChanges', { transactions: [{ id: crypto.randomUUID(), spaceId: space, operations: setOps(rowId, props) }] }, who);
/** AI 비서 편집·버튼 속성 편집과 같은 client 거래(ai/changes.ts·버튼 계획 단계가 쓰는 applyTransactions client:true) */
function clientTx(who: Who, rowId: string, props: Record<string, unknown>, source: string): 'ok' | 'refused' {
  try {
    dbm.withRequestCache(() => rec.applyTransactions(who.id, [{ id: crypto.randomUUID(), spaceId: space, operations: setOps(rowId, props) }] as any, undefined, { client: true, source }));
    return 'ok';
  } catch {
    return 'refused';
  }
}
/** 새 행 만들기(화면 저장 경로) */
const uiCreateRow = (who: Who, rowId: string, props: Record<string, unknown>) => rpc('applyChanges', {
  transactions: [{ id: crypto.randomUUID(), spaceId: space, operations: [{ pointer: { table: 'block', id: rowId, spaceId: space }, path: [], command: 'set',
    args: { id: rowId, type: 'page', parent_id: col, parent_table: 'collection', alive: true, space_id: space, properties: { title: [['출장비 청구']], ...props } } }] }],
}, who);

let api: (path: string, tk: string, init?: RequestInit) => Promise<Response>;
const tokens: Record<string, string> = {};

/** 템플릿 하나 쓰고(주인), 세 회원에게 그 페이지 일반 편집(read_and_write)을 준다 */
async function addApprovalTemplate(): Promise<{ root: string; col: string }> {
  const r = await rpc('getTemplate', { templateId: 'simple-approval', spaceId: space });
  expect(r.status).toBe(200);
  const pageId = (r.body as any).pageId as string;
  dbm.withRequestCache(() => {
    const b = dbm.getRecord<any>('block', pageId);
    dbm.putRecord('block', { ...b, permissions: [...(b.permissions ?? []), ...[requester, approver, third].map((u) => ({ type: 'user_permission', user_id: u.id, role: 'read_and_write' }))] });
  });
  return { root: pageId, col: collectionOfPage(pageId)! };
}

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  dbm = await import('../../src/litpage/server/db.ts');
  rec = await import('../../src/litpage/server/records.ts');
  engine = await import('../../src/litpage/server/automations/engine.ts');
  catalog = await import('../../src/litpage/server/content/catalog.ts');
  spec = await import('../../src/litpage/server/content/spec.ts');
  engine.setExternalNotifyHandler(external as never);
  space = ((await rpc('createWorkspace', { name: '결재 권한 팀' })).body as any).spaceId;
  for (const u of [requester, approver, third]) await rpc('createWorkspace', { name: `${u.name} 개인` }, u);
  // 세 회원을 이 워크스페이스 일반 회원으로(전체 권한 아님)
  dbm.withRequestCache(() => {
    const s = dbm.getRecord<any>('space', space);
    dbm.putRecord('space', { ...s, permissions: [...(s.permissions ?? []), ...[requester, approver, third].map((u) => ({ type: 'user_permission', user_id: u.id, role: 'read_and_write' }))] });
  });
  const { Hono } = await import('hono');
  const { registerPublicApi } = await import('../../src/litpage/server/publicApi/routes.ts');
  const app = new Hono();
  registerPublicApi(app);
  api = (path, tk, init = {}) => dbm.withRequestCache(() => Promise.resolve(app.fetch(new Request(`https://x.test/v1${path}`, { ...init, headers: { authorization: `Bearer ${tk}`, 'content-type': 'application/json' } }))));
});
afterAll(() => {
  engine.setExternalNotifyHandler(null as never);
});

// ---------------------------------------------------------------- 템플릿이 넘긴 규칙 검사(fail closed)
describe('E3-3 템플릿 속성 접근 규칙 — 틀리면 조용히 버리지 않고 전체 실패', () => {
  const T = () => spec.TEMPLATE_PROPERTY_ACCESS;
  const base = () => ({ title: { name: '건', type: 'title' }, who: { name: '결재자', type: 'person' }, st: { name: '상태', type: 'status' }, memo: { name: '메모', type: 'text' } }) as Record<string, any>;
  const build = (schema: Record<string, any>) => {
    const b = new spec.OpsBuilder('s', 'u');
    try {
      b.database({ name: 't', schema, rows: [{ values: { title: 'x' } }], views: [{ type: 'table' }] }, 'blk');
      return { ok: true, ops: b.ops.length };
    } catch (e) {
      return { ok: false, ops: b.ops.length, err: e };
    }
  };
  const person = (pid = 'who', role = 'content_only_editor') => ({ default_access: 'reader', overrides: [{ type: 'collection_property_permission', property_info: { property_id: pid, type: 'person' }, role }] });

  it('알려진 모양은 새 객체로 그대로 옮김(추가 키 없음)', () => {
    const s = base();
    s.st[T()] = person();
    const b = new spec.OpsBuilder('s', 'u');
    b.database({ name: 't', schema: s, rows: [], views: [{ type: 'table' }] }, 'blk');
    const c = b.ops.find((o: any) => o.pointer.table === 'collection')!.args as any;
    expect(c.schema.st.property_permissions).toEqual(person());
    expect(c.schema.st.property_permissions).not.toBe(s.st[T()]);
    expect(c.schema.memo.property_permissions).toBeUndefined();
  });

  it.each([
    ['특정 회원 예외(user_permission)', (s: any) => (s.st[T()] = { default_access: 'reader', overrides: [{ type: 'user_permission', user_id: 'x', role: 'editor' }] })],
    ['그룹 예외', (s: any) => (s.st[T()] = { default_access: 'reader', overrides: [{ type: 'group_permission', group_id: 'g', role: 'reader' }] })],
    ['없는 속성 참조', (s: any) => (s.st[T()] = person('nope'))],
    ['사람 속성이 아닌 속성 참조', (s: any) => (s.st[T()] = person('memo'))],
    ['created_by 종류인데 일반 속성 참조', (s: any) => (s.st[T()] = { default_access: 'reader', overrides: [{ type: 'collection_property_permission', property_info: { property_id: 'memo', type: 'created_by' }, role: 'content_only_editor' }] })],
    ['예외 역할이 목록 밖(editor)', (s: any) => (s.st[T()] = person('who', 'editor'))],
    ['default_access 목록 밖', (s: any) => (s.st[T()] = { default_access: 'editor', overrides: [] })],
    ['알 수 없는 키', (s: any) => (s.st[T()] = { default_access: 'reader', overrides: [], extra: 1 })],
    ['예외 안 알 수 없는 키', (s: any) => (s.st[T()] = { default_access: 'reader', overrides: [{ ...person().overrides[0], user_id: 'x' }] })],
    ['overrides가 배열 아님', (s: any) => (s.st[T()] = { default_access: 'reader', overrides: {} })],
    ['제목 속성에 규칙', (s: any) => (s.title[T()] = { default_access: 'reader', overrides: [] })],
    ['평범한 객체가 아님', (s: any) => (s.st[T()] = Object.create({ default_access: 'reader' }))],
  ])('%s → 예외 던짐·만든 기록 0', (_n, mutate) => {
    const s = base();
    mutate(s);
    const r = build(s);
    expect(r.ok).toBe(false);
    expect(r.err).toBeInstanceOf(spec.TemplatePropertyAccessError);
    expect(r.ops).toBe(0);
  });

  it('JSON 문자열 키 property_permissions(가져오기·AI 도구 경로)는 지금처럼 무시 — 규칙이 생기지 않음', () => {
    const s = JSON.parse('{"title":{"name":"건","type":"title"},"st":{"name":"상태","type":"status","property_permissions":{"default_access":"none","overrides":[]}}}');
    const b = new spec.OpsBuilder('s', 'u');
    b.database({ name: 't', schema: s, rows: [], views: [{ type: 'table' }] }, 'blk');
    const c = b.ops.find((o: any) => o.pointer.table === 'collection')!.args as any;
    expect(c.schema.st.property_permissions).toBeUndefined();
  });

  it('템플릿 정의가 틀리면 「템플릿 추가」 자체가 실패, 새 페이지·표·행 0(첫 갤러리 생성 시점)', async () => {
    const def = catalog.TEMPLATES.find((t) => t.id === 'simple-approval')!;
    const orig = def.build;
    def.build = () => {
      const sp = orig() as any;
      sp.db.schema.aSta[spec.TEMPLATE_PROPERTY_ACCESS] = { default_access: 'reader', overrides: [{ type: 'user_permission', user_id: third.id, role: 'editor' }] };
      return sp;
    };
    const before = { block: countRecords('block'), collection: countRecords('collection') };
    try {
      const r = await rpc('getTemplate', { templateId: 'simple-approval', spaceId: space });
      expect(r.status).toBeGreaterThanOrEqual(400);
    } finally {
      def.build = orig;
    }
    expect({ block: countRecords('block'), collection: countRecords('collection') }).toEqual(before);
  });
});

// ---------------------------------------------------------------- 실제 서버 경로 권한 행렬
describe('E3-3 결재자 전용 — 실제 쓰기 경로(일반 편집 회원 기준)', () => {
  let row = '';
  beforeAll(async () => {
    ({ root, col } = await addApprovalTemplate());
    // 실제 역할 확인: 주인=전체 권한, 세 회원=일반 편집
    dbm.withRequestCache(() => {
      expect(rec.blockRole(root, owner.id)).toBe('editor');
      for (const u of [requester, approver, third]) expect(rec.blockRole(root, u.id)).toBe('read_and_write');
    });
    for (const u of [requester, approver, third]) {
      const t = (await rpc('mcpCreateToken', { spaceId: space, name: '권한 시험' }, u)).body as any;
      expect(t.token).toBeTruthy();
      tokens[u.id] = t.token;
    }
  });

  it('복사본 규칙: 참조하는 속성 번호가 새 표 schema에 있고 종류가 맞음(갤러리 원본 표가 아님)', () => {
    const c = colOf(col);
    const s = c.schema as Record<string, any>;
    for (const pid of ['aSta', 'aMem', 'aDat']) {
      const o = s[pid].property_permissions.overrides[0];
      expect(s[pid].property_permissions.default_access).toBe('reader');
      expect(o.property_info).toEqual({ property_id: 'aApr', type: 'person' });
      expect(s[o.property_info.property_id].type).toBe('person');
    }
    for (const pid of ['aSub', 'aReq']) expect(s[pid].property_permissions.overrides[0].property_info).toEqual({ property_id: 'created_by', type: 'created_by' });
    expect(s.aApr.property_permissions).toEqual({ default_access: 'reader', overrides: [] });
    expect(s.aAmt.property_permissions).toBeUndefined();
    expect(s.title.property_permissions).toBeUndefined();
    expect(c.parent_id).toBe(root);
  });

  it('요청자: 새 결재 건(요청자=나) 만들기 허용 / 자기를 결재자로 넣은 새 건은 거절·행 0', async () => {
    const before = rowsOf(col).length;
    const self = crypto.randomUUID();
    const bad = await uiCreateRow(requester, self, { aReq: person(requester.id), aApr: person(requester.id) });
    expect(bad.status).toBeGreaterThanOrEqual(400);
    expect(rowsOf(col).length).toBe(before);
    row = crypto.randomUUID();
    const ok = await uiCreateRow(requester, row, { aReq: person(requester.id) });
    expect(ok.status).toBe(200);
    expect(rowsOf(col).length).toBe(before + 1);
    expect(getRow(row).created_by_id).toBe(requester.id);
    expect(prop(row, 'aSta')).toBe('null'); // 상태 기본값은 저장되지 않음(새 행이 규칙에 막히지 않음)
  });

  it('결재자 지정: 요청자·결재자·제3자 모두 거절, 전체 권한자(주인)만 허용', async () => {
    for (const u of [requester, approver, third]) {
      expect((await uiSet(u, row, { aApr: person(u.id) })).status).toBeGreaterThanOrEqual(400);
    }
    expect(prop(row, 'aApr')).toBe('null');
    expect((await uiSet(owner, row, { aApr: person(approver.id) })).status).toBe(200);
    expect(prop(row, 'aApr')).toContain(approver.id);
  });

  it('결재 올림: 요청자(그 건을 쓴 사람)만 — 체크하면 결재자에게 앱 알림 1·외부 발송 0 / 결재자·제3자는 거절', async () => {
    for (const u of [approver, third]) expect((await uiSet(u, row, { aSub: [['Yes']] })).status).toBeGreaterThanOrEqual(400);
    expect(prop(row, 'aSub')).toBe('null');
    expect((await uiSet(requester, row, { aSub: [['Yes']] })).status).toBe(200);
    await engine.flushAutomations();
    // 결재자로 지정될 때 가는 기존 「사람 속성 지정」 알림(property_mention)은 빼고 자동화 알림만 센다
    expect(notes(approver.id).filter((x) => x.type === 'property_mention')).toHaveLength(1);
    const n = notes(approver.id).filter((x) => x.type === 'automation');
    expect(n).toHaveLength(1);
    expect(n[0].activity.automation_name).toBe('결재 요청 알림(결재자)');
    expect(external).not.toHaveBeenCalled();
  });

  it('상태·결재 의견·결재일: 요청자·제3자 거절(값 그대로), 선택된 결재자만 허용 → 요청자에게 결과 알림', async () => {
    for (const u of [requester, third]) {
      expect((await uiSet(u, row, { aSta: [['승인']] })).status).toBeGreaterThanOrEqual(400);
      expect((await uiSet(u, row, { aMem: [['내가 승인']] })).status).toBeGreaterThanOrEqual(400);
      expect((await uiSet(u, row, { aDat: [['‣', [['d', { type: 'date', start_date: '2026-11-17' }]]]] })).status).toBeGreaterThanOrEqual(400);
    }
    expect(prop(row, 'aSta')).toBe('null');
    expect(prop(row, 'aMem')).toBe('null');
    expect((await uiSet(approver, row, { aSta: [['승인']], aMem: [['확인했습니다']] })).status).toBe(200);
    expect(prop(row, 'aSta')).toContain('승인');
    await engine.flushAutomations();
    expect(notes(requester.id).some((x) => x.activity.automation_name === '결재 결과 알림(요청자)')).toBe(true);
  });

  it('같은 거래 우회: 요청자가 「결재자=나 + 상태 승인」을 한 번에 → 전체 거절, 둘 다 그대로', async () => {
    const r2 = crypto.randomUUID();
    expect((await uiCreateRow(requester, r2, { aReq: person(requester.id) })).status).toBe(200);
    const res = await uiSet(requester, r2, { aApr: person(requester.id), aSta: [['승인']] });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(prop(r2, 'aApr')).toBe('null');
    expect(prop(r2, 'aSta')).toBe('null');
  });

  it('요청자 칸은 그 건을 쓴 사람만 — 제3자가 남의 건 요청자를 바꾸면 거절', async () => {
    expect((await uiSet(third, row, { aReq: person(third.id) })).status).toBeGreaterThanOrEqual(400);
    expect(prop(row, 'aReq')).toContain(requester.id);
  });

  it('규칙 자체(스키마) 변경: 일반 편집 회원은 거절(예: 상태 규칙 지우기)', async () => {
    const res = await rpc('applyChanges', { transactions: [{ id: crypto.randomUUID(), spaceId: space, operations: [
      { pointer: { table: 'collection', id: col, spaceId: space }, path: ['schema', 'aSta', 'property_permissions'], command: 'set', args: { default_access: 'inherit', overrides: [] } },
    ] }] }, third);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(colOf(col).schema.aSta.property_permissions.default_access).toBe('reader');
  });

  it('공개 API(PATCH /v1/pages/:id): 제3자·요청자 상태 변경 거절, 결재자 허용', async () => {
    const body = (v: string) => JSON.stringify({ properties: { 상태: { status: { name: v } } } });
    for (const u of [third, requester]) {
      const r = await api(`/pages/${row}`, tokens[u.id], { method: 'PATCH', body: body('반려') });
      expect(r.status).toBeGreaterThanOrEqual(400);
    }
    expect(prop(row, 'aSta')).toContain('승인');
    const ok = await api(`/pages/${row}`, tokens[approver.id], { method: 'PATCH', body: body('반려') });
    expect(ok.status).toBe(200);
    expect(prop(row, 'aSta')).toContain('반려');
  });

  it('AI 비서·버튼과 같은 client 거래: 제3자 거절, 결재자 허용', () => {
    expect(clientTx(third, row, { aSta: [['승인']] }, 'ai:agent')).toBe('refused');
    expect(clientTx(requester, row, { aSta: [['승인']] }, 'button')).toBe('refused');
    expect(prop(row, 'aSta')).toContain('반려');
    expect(clientTx(approver, row, { aSta: [['승인']] }, 'button')).toBe('ok');
    expect(prop(row, 'aSta')).toContain('승인');
  });

  it('전체 권한자(주인)는 기존처럼 모든 칸을 바꿀 수 있음(남은 예외 — 템플릿 설명에 밝힘)', async () => {
    expect((await uiSet(owner, row, { aSta: [['반려']], aMem: [['주인이 바꿈']], aSub: [['No']] })).status).toBe(200);
    expect(prop(row, 'aSta')).toContain('반려');
    expect(catalog.TEMPLATES.find((t) => t.id === 'simple-approval')!.description).toMatch(/전체 권한자는 모든 칸을 바꿀 수 있습니다/);
  });

  it('반례(규칙이 없는 표 = E3-2까지): 같은 일반 편집 제3자가 상태를 바꿀 수 있었음', async () => {
    const other = await addApprovalTemplate();
    dbm.withRequestCache(() => {
      const c = dbm.getRecord<any>('collection', other.col);
      const schema = Object.fromEntries(Object.entries(c.schema).map(([k, v]: [string, any]) => { const { property_permissions: _p, ...rest } = v; return [k, rest]; }));
      dbm.putRecord('collection', { ...c, schema });
    });
    const r = rowsOf(other.col)[0].id;
    expect((await uiSet(third, r, { aSta: [['승인']] })).status).toBe(200);
    expect(prop(r, 'aSta')).toContain('승인');
  });
});

describe('E3-3 회귀: 다른 템플릿·빈 표 적용', () => {
  it('다른 템플릿(프로젝트 관리)에는 속성 규칙이 생기지 않음', async () => {
    const r = await rpc('getTemplate', { templateId: 'project-tracker', spaceId: space });
    const c = colOf(collectionOfPage((r.body as any).pageId)!);
    for (const p of Object.values(c.schema as Record<string, any>)) expect(p.property_permissions).toBeUndefined();
  });
});
