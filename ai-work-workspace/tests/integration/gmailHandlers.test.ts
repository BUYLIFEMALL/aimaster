// WS-20261117-25 E4 Gmail OFF 배선 — 실제 /api/rpc/[name] POST 처리기 + 실제 runtime(runRpc) + gmailHandlers.
// 워크스페이스 DB: Docker aww-pg-test 안 **전용 qa_gmail_wire**(이 시험이 만들고 끝에 지움, aww·aww_dev 초기화 0).
// Supabase(createAdminClient)는 불리면 실패하도록 막고, Gmail 저장소·구글 호출은 gmailInbox.ts의 시험용 주입(가짜)만. 실키·실네트워크 0.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { inspect } from 'node:util';

const ADMIN = 'postgres://postgres:awwlocal@127.0.0.1:55432/aww';
const DB = 'qa_gmail_wire';
process.env.AWW_DATABASE_URL = `postgres://aww_app:awwapp@127.0.0.1:55432/${DB}`;

const h = vi.hoisted(() => ({ sessionUser: 'e5555555-5555-4555-8555-555555555555', adminCalls: 0, pre: { aiKeys: 0, warm: 0, after: 0 } }));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: () => { h.pre.after++; } }));
vi.mock('@/lib/access', () => ({ checkProgramAccessApi: async () => (h.sessionUser ? { allowed: true, user: { id: h.sessionUser, email: 'wire@example.com' } } : { allowed: false, status: 401, error: '로그인이 필요합니다.' }) }));
vi.mock('@/server/member', () => ({ memberFromUser: (u: { id: string; email: string }) => ({ id: u.id, email: u.email, name: '배선시험' }) }));
vi.mock('@/server/memberJobs', () => ({ trackMemberJobs: async (fn: () => Promise<unknown>) => ({ result: await fn(), scheduled: false }) }));
vi.mock('@/server/memberScheduling', () => ({ afterRpc: async () => {} }));
vi.mock('@/server/memberAiKeys', () => ({ loadMemberAiKeys: async () => { h.pre.aiKeys++; return {}; } }));
vi.mock('@/litpage/server/ai/models.ts', async (orig) => ({ ...(await orig<typeof import('../../src/litpage/server/ai/models.ts')>()), warmModelLists: async () => { h.pre.warm++; } }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => { h.adminCalls++; throw new Error('실제 Supabase 접근 금지(시험)'); } }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { signOut: async () => ({}) } }) }));

let POST: typeof import('../../src/app/api/rpc/[name]/route.ts').POST;
let gm: typeof import('../../src/server/gmailInbox.ts');
let guard: typeof import('../../src/lib/accountGuard.ts');
const storeCalls: { fn: string; userId?: string }[] = [];
let fetchCalls = 0;
const SUB = 'sub-W';
const UUID1 = '11111111-2222-4333-8444-555555555555';
type Mode = { addResult?: () => Promise<any>; getAppThrows?: unknown; rows?: any[]; listThrows?: unknown; deleteThrows?: unknown };
const mode: Mode = {};
const fakeStore = () => ({
  async getApp(u: string) { storeCalls.push({ fn: 'getApp', userId: u }); if (mode.getAppThrows) throw mode.getAppThrows; return { clientId: 'c', clientSecret: 's' }; },
  async listAccounts(u: string) { storeCalls.push({ fn: 'list', userId: u }); if (mode.listThrows) throw mode.listThrows; return mode.rows ?? [{ id: 'r1', externalId: SUB, username: 'w@example.com', accessToken: 'ya29.x', refreshToken: 'r', tokenExpiresAt: new Date(Date.now() + 3600e3).toISOString(), grantedScopes: [], appRef: 'c' }]; },
  async save() { storeCalls.push({ fn: 'save' }); return { error: null }; },
  async updateToken() { storeCalls.push({ fn: 'update' }); },
  async markNeedsReconnect() { storeCalls.push({ fn: 'reconnect' }); },
  async deleteAccount(u: string) { storeCalls.push({ fn: 'delete', userId: u }); if (mode.deleteThrows) throw mode.deleteThrows; },
  async addToInbox(i: any) { storeCalls.push({ fn: 'add', userId: i.userId }); return mode.addResult ? mode.addResult() : { status: 'added', inboxId: UUID1 }; },
});
const fakeFetch = (async (u: string) => {
  fetchCalls++;
  const url = String(u);
  if (/messages\?/.test(url)) return new Response(JSON.stringify({ messages: [{ id: 'm1' }] }), { status: 200 });
  if (/messages\/m1\?/.test(url)) return new Response(JSON.stringify({ id: 'm1', payload: { headers: [{ name: 'Subject', value: '제목' }, { name: 'From', value: 'a@b' }, { name: 'Date', value: 'Mon, 17 Nov 2026 09:00:00 +0900' }] } }), { status: 200 });
  return new Response('{}', { status: 404 });
}) as unknown as typeof fetch;

function call(name: string, body: unknown = {}, expected?: string | null) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' };
  if (expected !== undefined && expected !== null) headers[guard.EXPECTED_ACCOUNT_HEADER] = expected;
  return POST(new (require('next/server').NextRequest)(`http://localhost/api/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(body) }), { params: Promise.resolve({ name }) });
}
const reset = (on: boolean) => {
  gm.setGmailEnabledForTests(on);
  gm.setGmailStoreForTests(fakeStore() as any);
  gm.setGmailFetch(fakeFetch);
  storeCalls.length = 0; fetchCalls = 0; h.adminCalls = 0; h.pre = { aiKeys: 0, warm: 0, after: 0 };
  for (const k of Object.keys(mode)) delete (mode as any)[k];
  h.sessionUser = 'e5555555-5555-4555-8555-555555555555';
};

beforeAll(async () => {
  const admin = postgres(ADMIN, { max: 1, onnotice: () => {} });
  await admin.unsafe(`drop database if exists ${DB}`);
  await admin.unsafe(`create database ${DB}`);
  await admin.end();
  const find = (rel: string) => ['.', '..'].map((d) => resolve(process.cwd(), d, rel)).find((f) => existsSync(f))!;
  const su = postgres(`postgres://postgres:awwlocal@127.0.0.1:55432/${DB}`, { max: 1, onnotice: () => {} });
  await su.unsafe(readFileSync(find('ai-work-workspace/supabase/migrations/20261024000000_ai_work_workspace_init.sql'), 'utf8')).simple();
  await su.end();
  ({ POST } = await import('../../src/app/api/rpc/[name]/route.ts'));
  gm = await import('../../src/server/gmailInbox.ts');
  guard = await import('../../src/lib/accountGuard.ts');
}, 120_000);
afterAll(async () => {
  gm?.setGmailEnabledForTests(false);
  gm?.setGmailStoreForTests(null);
  gm?.setGmailFetch(undefined);
  const admin = postgres(ADMIN, { max: 1, onnotice: () => {} });
  await admin.unsafe(`drop database if exists ${DB} with (force)`);
  await admin.end();
});

describe('꺼짐(기본) — 4명령 모두 off 봉투, Gmail 저장소·구글·OAuth 호출 0(공통 전처리는 그대로 실행됨)', () => {
  it.each([['gmailStatus', {}], ['gmailList', { expectSub: SUB }], ['gmailAdd', { messageId: 'm1', title: 't', expectSub: SUB }], ['gmailDisconnect', {}]])('%s', async (name, body) => {
    reset(false);
    const res = await call(name, body, h.sessionUser);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, code: 'off', message: 'Gmail 가져오기는 아직 꺼져 있습니다.' });
    expect(storeCalls).toEqual([]);
    expect(fetchCalls).toBe(0);
    expect(h.adminCalls).toBe(0);
    // QA040 범위 정정: 공통 /api/rpc 전처리(AI 키 읽기·모델 목록 준비·끝난 뒤 작업)는 Gmail 꺼짐 확인과 별도로 실행된다 — 보장은 Gmail 전용 저장소·구글·OAuth 호출 0까지
    expect(h.pre.aiKeys).toBe(1);
    expect(h.pre.warm).toBe(1);
    expect(h.pre.after).toBe(1);
  });
});

describe('켜짐 — 실제 경로·runtime 통과', () => {
  it('gmailStatus: 회원은 세션만(본문 userId 무시)', async () => {
    reset(true);
    const res = await call('gmailStatus', { userId: 'attacker' }, h.sessionUser);
    expect(await res.json()).toEqual({ ok: true, connected: true, email: 'w@example.com', sub: SUB });
    expect(storeCalls.every((c) => c.userId === undefined || c.userId === h.sessionUser)).toBe(true);
  });
  it('gmailList: 정상 → items, expectSub 없음·숫자 → bad_request(저장소 0)', async () => {
    reset(true);
    const ok = await (await call('gmailList', { expectSub: SUB }, h.sessionUser)).json();
    expect(ok.ok).toBe(true);
    expect(ok.items).toEqual([{ id: 'm1', subject: '제목', from: 'a@b', date: '2026-11-17T00:00:00.000Z' }]);
    storeCalls.length = 0;
    for (const body of [{}, { expectSub: 5 }, { expectSub: '' }]) {
      expect(await (await call('gmailList', body, h.sessionUser)).json()).toEqual({ ok: false, code: 'bad_request', message: '요청 내용이 올바르지 않습니다. 목록을 새로 열어 주세요.' });
    }
    expect(storeCalls).toEqual([]);
  });
  it('gmailAdd: 정상 added, 입력 형식 위반 → bad_request(저장소 0), 본문 userId 무시', async () => {
    reset(true);
    const r = await (await call('gmailAdd', { messageId: 'm1', title: '견적', expectSub: SUB, userId: 'attacker', sourceUrl: 'https://evil' }, h.sessionUser)).json();
    expect(r).toEqual({ ok: true, status: 'added', inboxId: UUID1 });
    expect(storeCalls.find((c) => c.fn === 'add')?.userId).toBe(h.sessionUser);
    storeCalls.length = 0;
    for (const body of [{ messageId: 1, title: 't', expectSub: SUB }, { messageId: 'm1', expectSub: SUB }, { messageId: 'm1', title: 't' }, { messageId: 'x'.repeat(65), title: 't', expectSub: SUB }]) {
      expect((await (await call('gmailAdd', body, h.sessionUser)).json()).code).toBe('bad_request');
    }
    expect(storeCalls).toEqual([]);
  });
  it.each([
    ['conflict', async () => { throw new gm.GmailError('conflict', 'RAW claim'); }, 'conflict'],
    ['server', async () => { throw new gm.GmailError('server', 'RAW sql'); }, 'server'],
    ['unknown(원문 Error)', async () => { throw new Error('RAW network'); }, 'unknown'],
  ])('gmailAdd 저장소 %s → 같은 code·고정 문구만(원문 0)', async (_n, fn, code) => {
    reset(true);
    mode.addResult = fn as () => Promise<any>;
    const r = await (await call('gmailAdd', { messageId: 'm1', title: 't', expectSub: SUB }, h.sessionUser)).json();
    expect(r).toEqual({ ok: false, code, message: (gm.GMAIL_ADD_MESSAGES as any)[code] });
    expect(JSON.stringify(r)).not.toContain('RAW');
  });
  it('gmailDisconnect: 로컬 연결 줄만 삭제, 구글 호출 0', async () => {
    reset(true);
    expect(await (await call('gmailDisconnect', {}, h.sessionUser)).json()).toEqual({ ok: true });
    expect(storeCalls.map((c) => c.fn)).toEqual(['delete']);
    expect(fetchCalls).toBe(0);
  });
});

describe('기대 계정·로그인(명령 전 거절)', () => {
  it.each(['gmailStatus', 'gmailList', 'gmailAdd', 'gmailDisconnect'])('%s: 기대 계정 ≠ 세션 → 409 계정 바뀜, 명령 실행 0', async (name) => {
    reset(true);
    const res = await call(name, { messageId: 'm1', title: 't', expectSub: SUB }, 'someone-else');
    expect(res.status).toBe(409);
    expect((await res.json()).name).toBe(guard.ACCOUNT_CHANGED_NAME);
    expect(storeCalls).toEqual([]);
    expect(fetchCalls).toBe(0);
  });
  it('비로그인 → 401, 명령 실행 0', async () => {
    reset(true);
    h.sessionUser = '';
    const res = await call('gmailStatus', {}, null);
    expect(res.status).toBe(401);
    expect(storeCalls).toEqual([]);
  });
});


// ---------------------------------------------------------------- QA040 P2: Gmail이 아닌 예외의 원문이 응답·서버 기록 어디에도 남지 않음
describe('QA040 예상 밖 예외 — 응답·console 모든 인자에 원문 0', () => {
  const RAW = 'RAW_TOKEN_AND_MAIL_FIXTURE';
  const raws = (): unknown[] => {
    const e1 = new Error(`${RAW} ya29.secret mail@example.com`);
    const e2 = new Error('wrapper', { cause: new Error(RAW) });
    const e3: any = new Error('plain'); e3.detail = RAW; e3.stack = `Error: ${RAW}\n    at fixture`;
    return [e1, e2, e3, RAW, { message: RAW }];
  };
  const cases: [string, string, Record<string, unknown>, (e: unknown) => void, string][] = [
    ['gmailStatus', '연결 줄 읽기', {}, (e) => { mode.listThrows = e; }, 'server'],
    ['gmailList', '연결 줄 읽기', { expectSub: SUB }, (e) => { mode.listThrows = e; }, 'server'],
    ['gmailList', '구글 앱 읽기', { expectSub: SUB }, (e) => { mode.getAppThrows = e; }, 'server'],
    ['gmailAdd', '받은 업무 저장', { messageId: 'm1', title: 't', expectSub: SUB }, (e) => { mode.addResult = async () => { throw e; }; }, 'unknown'],
    ['gmailAdd', '구글 앱 읽기', { messageId: 'm1', title: 't', expectSub: SUB }, (e) => { mode.getAppThrows = e; }, 'unknown'],
    ['gmailDisconnect', '연결 줄 삭제', {}, (e) => { mode.deleteThrows = e; }, 'unknown'],
  ];
  for (const [name, where, body, arm, code] of cases) {
    it(`${name}(${where} 예외): 원문 예외 5종 → 200 고정 봉투(${code}), console 원문 0`, async () => {
      for (const raw of raws()) {
        reset(true);
        arm(raw);
        const logged: unknown[][] = [];
        const spies = (['error', 'warn', 'log', 'info', 'debug'] as const).map((k) => vi.spyOn(console, k).mockImplementation((...a: unknown[]) => { logged.push(a); }));
        let res: Response;
        try {
          res = await call(name, body, h.sessionUser);
        } finally {
          spies.forEach((sp) => sp.mockRestore());
        }
        const out = await res!.json();
        const dump = logged.map((args) => args.map((a) => (typeof a === 'string' ? a : inspect(a, { depth: 10, showHidden: true }))).join(' ')).join('\n');
        expect(dump).not.toContain(RAW);
        expect(dump).not.toContain('ya29');
        expect(res!.status).toBe(200);
        expect(out.ok).toBe(false);
        expect(out.code).toBe(code);
        expect(Object.keys(out).sort()).toEqual(['code', 'message', 'ok']);
        expect(JSON.stringify(out)).not.toContain(RAW);
      }
    });
  }
  it('정상 GmailError 봉투·401·409 계약은 그대로', async () => {
    reset(true);
    mode.addResult = async () => { throw new gm.GmailError('conflict', 'x'); };
    expect((await (await call('gmailAdd', { messageId: 'm1', title: 't', expectSub: SUB }, h.sessionUser)).json()).code).toBe('conflict');
    expect((await call('gmailStatus', {}, 'other')).status).toBe(409);
    h.sessionUser = '';
    expect((await call('gmailStatus', {}, null)).status).toBe(401);
  });
});
