// WS-20261117-25 E4 1단계 — Gmail 연결·받은 편지함 목록(꺼짐으로 시작). 실제 구글·실제 DB·실제 키 0.
// 구글 호출은 가짜 fetch, 저장은 메모리 가짜 저장소(setGmailStoreForTests), 실제 DB 함수(createAdminClient)는 불리면 바로 실패.
// id_token은 시험 안에서 만든 RSA 키로 서명하고 가짜 공개 키 목록(JWKS)으로 검증한다.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync, sign as rsaSign, type KeyObject } from 'node:crypto';
import { NextRequest } from 'next/server';

const adminCalls = vi.hoisted(() => ({ n: 0 }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    adminCalls.n++;
    throw new Error('실제 DB 접근 금지(시험)');
  },
}));
const access = vi.hoisted(() => ({ fn: null as null | ((...a: unknown[]) => unknown), calls: 0 }));
vi.mock('@/lib/access', () => ({
  checkProgramAccessApi: async () => {
    access.calls++;
    return access.fn ? access.fn() : { allowed: false, status: 401 };
  },
}));

let gm: typeof import('../../src/server/gmailInbox.ts');
let startRoute: typeof import('../../src/app/api/oauth/google-gmail/start/route.ts');
let cbRoute: typeof import('../../src/app/api/oauth/google-gmail/callback/route.ts');

const USER = 'a1111111-1111-4111-8111-111111111111';
const OTHER_USER = 'a2222222-2222-4222-8222-222222222222';
const CLIENT = 'member-own-client.apps.googleusercontent.com';
const SECRET = 'member-own-secret-fake';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.metadata';

// ---------------------------------------------------------------- RSA 키·id_token
let priv: KeyObject;
let jwk: Record<string, unknown>;
const KID = 'test-kid-1';
function idToken(claims: Record<string, unknown>, opts: { kid?: string; alg?: string; key?: KeyObject } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const h = Buffer.from(JSON.stringify({ alg: opts.alg ?? 'RS256', kid: opts.kid ?? KID, typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: CLIENT, sub: 'sub-A', email: 'a@example.com', email_verified: true, iat: now, exp: now + 3600, ...claims })).toString('base64url');
  const s = rsaSign('RSA-SHA256', Buffer.from(`${h}.${p}`), opts.key ?? priv).toString('base64url');
  return `${h}.${p}.${s}`;
}

// ---------------------------------------------------------------- 가짜 저장소
type Row = import('../../src/server/gmailInbox.ts').GmailAccount & { userId: string };
let rows: Row[] = [];
let app: { clientId: string; clientSecret: string } | null = { clientId: CLIENT, clientSecret: SECRET };
const storeCalls: string[] = [];
const adds: any[] = [];
let tick = async () => {};
const fakeStore = () => ({
  async getApp() { storeCalls.push('getApp'); await tick(); return app; },
  async listAccounts(userId: string) { storeCalls.push('list'); await tick(); return rows.filter((r) => r.userId === userId).map(({ userId: _u, ...r }) => ({ ...r })); },
  async save(i: any) {
    storeCalls.push('save'); await tick();
    // F03: 공용 표의 부분 고유 인덱스(회원당 google_gmail 1줄) 흉내 — 실제 DB 동작은 gmailF03Db.test.ts가 확인
    if (rows.some((r) => r.userId === i.userId && r.externalId !== i.externalId)) {
      const error = 'duplicate key value violates unique constraint "member_platform_accounts_gmail_one"';
      return { error, otherAccount: gm.isGmailOneAccountViolation(error) };
    }
    const cur = rows.find((r) => r.userId === i.userId && r.externalId === i.externalId);
    if (cur) Object.assign(cur, { accessToken: i.accessToken, refreshToken: i.refreshToken ?? cur.refreshToken, tokenExpiresAt: i.tokenExpiresAt, grantedScopes: i.grantedScopes, appRef: i.appRef, username: i.username });
    else rows.push({ id: `row-${rows.length + 1}-${i.externalId}`, userId: i.userId, externalId: i.externalId, username: i.username, accessToken: i.accessToken, refreshToken: i.refreshToken, tokenExpiresAt: i.tokenExpiresAt, grantedScopes: i.grantedScopes, appRef: i.appRef });
    return { error: null };
  },
  async updateToken(_u: string, id: string, t: any) { storeCalls.push('update'); const r = rows.find((x) => x.id === id); if (r) Object.assign(r, { accessToken: t.accessToken, tokenExpiresAt: t.tokenExpiresAt }); },
  async markNeedsReconnect() { storeCalls.push('reconnect'); },
  async addToInbox(i: any) { storeCalls.push('add'); adds.push(i); return { status: 'added' as const, inboxId: 'inbox-1' }; },
  async deleteAccount(userId: string, externalId?: string, onlyIfAccessToken?: string) { storeCalls.push('delete'); await tick(); rows = rows.filter((r) => !(r.userId === userId && (!externalId || r.externalId === externalId) && (!onlyIfAccessToken || r.accessToken === onlyIfAccessToken))); },
});

// ---------------------------------------------------------------- 가짜 구글
type Hit = { url: string; method: string; body?: string; auth?: string };
let hits: Hit[] = [];
let tokenReply: () => Response;
let onGet: (id: string) => void = () => {};
let listReply: () => Response = () => json({ messages: [{ id: 'm1', threadId: 't1' }, { id: 'm2', threadId: 't2' }, { id: 'bad id!', threadId: 't3' }] });
const json = (b: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json', ...headers } });
const fakeFetch = (async (input: string, init: RequestInit = {}) => {
  const url = String(input);
  hits.push({ url, method: init.method ?? 'GET', body: typeof init.body === 'string' ? init.body : undefined, auth: (init.headers as Record<string, string> | undefined)?.authorization });
  if (url.startsWith('https://www.googleapis.com/oauth2/v3/certs')) return json({ keys: [{ ...jwk, kid: KID, alg: 'RS256', use: 'sig' }] }, 200, { 'cache-control': 'public, max-age=3600' });
  if (url === 'https://oauth2.googleapis.com/token') return tokenReply();
  const m = /gmail\/v1\/users\/me\/messages(?:\/([^?]+))?\?/.exec(url);
  if (m && !m[1]) return listReply();
  if (m && m[1]) {
    onGet(decodeURIComponent(m[1]));
    return json({ id: m[1], snippet: '비밀 미리보기 글', payload: { headers: [{ name: 'Subject', value: `제목 ${m[1]}\n줄바꿈` }, { name: 'From', value: '보낸이 <x@example.com>' }, { name: 'Date', value: 'Mon, 17 Nov 2026 09:00:00 +0900' }, { name: 'To', value: 'me@example.com' }], parts: [{ body: { data: 'BODY' } }] } });
  }
  return json({ error: 'unexpected' }, 404);
}) as unknown as typeof fetch;
const goodToken = (claims: Record<string, unknown> = {}, scope = `openid ${GMAIL_SCOPE} https://www.googleapis.com/auth/userinfo.email`) =>
  () => json({ access_token: 'ya29.fake-access', refresh_token: '1//fake-refresh', expires_in: 3600, scope, id_token: idToken(claims) });

beforeAll(async () => {
  const kp = generateKeyPairSync('rsa', { modulusLength: 2048 });
  priv = kp.privateKey;
  jwk = kp.publicKey.export({ format: 'jwk' }) as Record<string, unknown>;
  gm = await import('../../src/server/gmailInbox.ts');
  startRoute = await import('../../src/app/api/oauth/google-gmail/start/route.ts');
  cbRoute = await import('../../src/app/api/oauth/google-gmail/callback/route.ts');
});
function reset(on: boolean) {
  gm.setGmailEnabledForTests(on);
  gm.setGmailFetch(fakeFetch);
  gm.setGmailStoreForTests(fakeStore() as any);
  rows = []; hits = []; storeCalls.length = 0; adds.length = 0; adminCalls.n = 0; access.calls = 0; access.fn = null;
  app = { clientId: CLIENT, clientSecret: SECRET };
  tokenReply = goodToken();
  tick = async () => {};
  onGet = () => {};
  listReply = () => json({ messages: [{ id: 'm1', threadId: 't1' }, { id: 'm2', threadId: 't2' }, { id: 'bad id!', threadId: 't3' }] });
}
afterEach(() => {
  gm.setGmailEnabledForTests(false);
  gm.setGmailStoreForTests(null);
  gm.setGmailFetch(undefined);
});
const tagCookie = () => `${'s'.repeat(48)}.${USER}.${gm.appTagOf(CLIENT)}`;

// ---------------------------------------------------------------- 꺼짐
describe('기능 꺼짐(기본) — DB·구글 호출 0', () => {
  it('불러온 뒤 기본값은 꺼짐', () => {
    expect(gm.gmailEnabled()).toBe(false);
    expect(adminCalls.n).toBe(0);
  });
  it('모든 진입 함수가 DB·구글 전에 거절', async () => {
    reset(false);
    for (const p of [gm.startGmailConnect(USER), gm.completeGmailConnect(USER, 'code', 'tag'), gm.gmailStatus(USER), gm.listGmailInbox(USER), gm.disconnectGmail(USER)]) {
      await expect(p).rejects.toMatchObject({ code: 'off' });
    }
    expect(storeCalls).toEqual([]);
    expect(hits).toEqual([]);
    expect(adminCalls.n).toBe(0);
  });
  it('OAuth 시작·콜백 경로: 회원 확인(DB)보다 먼저 off로 돌려보냄', async () => {
    reset(false);
    const s = await startRoute.GET(new Request('https://ai-work-workspace.buylife.xyz/api/oauth/google-gmail/start'));
    expect(s.headers.get('location')).toContain('gmail_error=off');
    const c = await cbRoute.GET(new NextRequest('https://ai-work-workspace.buylife.xyz/api/oauth/google-gmail/callback?code=x&state=y'));
    expect(c.headers.get('location')).toContain('gmail_error=off');
    expect(access.calls).toBe(0);
    expect(storeCalls).toEqual([]);
    expect(hits).toEqual([]);
    expect(adminCalls.n).toBe(0);
  });
});

// ---------------------------------------------------------------- id_token 검증
describe('id_token 검증(서명·발급자·대상·만료)', () => {
  it.each([
    ['정상', () => idToken({}), { sub: 'sub-A', email: 'a@example.com' }],
    ['이메일 미확인 → 이메일 없음', () => idToken({ email_verified: false }), { sub: 'sub-A', email: null }],
    ['다른 앱(aud)', () => idToken({ aud: 'other-client' }), null],
    ['다른 발급자', () => idToken({ iss: 'https://evil.example' }), null],
    ['만료', () => idToken({ exp: Math.floor(Date.now() / 1000) - 10 }), null],
    ['모르는 키 번호', () => idToken({}, { kid: 'nope' }), null],
    ['다른 키로 서명', () => idToken({}, { key: generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey }), null],
    ['alg none', () => { const t = idToken({}).split('.'); return `${Buffer.from(JSON.stringify({ alg: 'none', kid: KID })).toString('base64url')}.${t[1]}.`; }, null],
    ['서명 없이 내용만 바꿈', () => { const t = idToken({}).split('.'); return `${t[0]}.${Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: CLIENT, sub: 'sub-EVIL', iat: 1, exp: 9e9 })).toString('base64url')}.${t[2]}`; }, null],
    ['sub 없음', () => idToken({ sub: '' }), null],
  ])('%s', async (_n, make, want) => {
    reset(true);
    expect(await gm.verifyGoogleIdToken((make as () => string)(), CLIENT)).toEqual(want);
  });
});

// ---------------------------------------------------------------- 연결
describe('연결(시작·콜백)', () => {
  it('시작: 동의 주소에 openid·email·gmail.metadata만, include_granted_scopes 없음, 쿠키=state.회원.앱표식', async () => {
    reset(true);
    const r = await gm.startGmailConnect(USER);
    const u = new URL(r.url);
    expect(u.searchParams.get('scope')).toBe(`openid email ${GMAIL_SCOPE}`);
    expect(u.searchParams.get('include_granted_scopes')).toBeNull();
    expect(u.searchParams.get('redirect_uri')).toBe('https://ai-work-workspace.buylife.xyz/api/oauth/google-gmail/callback');
    expect(u.searchParams.get('client_id')).toBe(CLIENT);
    const [state, user, tag] = r.cookie.split('.');
    expect(state).toBe(u.searchParams.get('state'));
    expect(user).toBe(USER);
    expect(tag).toBe(gm.appTagOf(CLIENT));
    expect(hits).toEqual([]);
  });

  it('성공: 검증한 sub로 저장(권한 그대로·앱 표시), 토큰은 응답에 없음', async () => {
    reset(true);
    const r = await gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT));
    expect(r).toEqual({ email: 'a@example.com' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ externalId: 'sub-A', appRef: CLIENT, refreshToken: '1//fake-refresh' });
    expect(JSON.stringify(r)).not.toContain('ya29');
  });

  it('앱이 연결 도중 바뀜(앱 표식 불일치) → 코드 교환 전에 거절', async () => {
    reset(true);
    await expect(gm.completeGmailConnect(USER, 'code', gm.appTagOf('another-client'))).rejects.toMatchObject({ code: 'bad_request' });
    expect(hits).toEqual([]);
    expect(rows).toHaveLength(0);
  });

  it.each([
    ['metadata 권한 없음', `openid https://www.googleapis.com/auth/userinfo.email`],
    ['readonly가 함께 옴(과다)', `openid ${GMAIL_SCOPE} https://www.googleapis.com/auth/gmail.readonly`],
    ['캘린더 묶음 권한이 함께 옴(과다)', `openid ${GMAIL_SCOPE} https://www.googleapis.com/auth/calendar.events`],
    ['전체 메일 권한(과다)', `openid ${GMAIL_SCOPE} https://mail.google.com/`],
  ])('권한 %s → 거절·저장 0', async (_n, scope) => {
    reset(true);
    tokenReply = goodToken({}, scope);
    await expect(gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT))).rejects.toMatchObject({ code: 'forbidden' });
    expect(rows).toHaveLength(0);
  });

  it('id_token 검증 실패(다른 앱 대상) → 저장 0', async () => {
    reset(true);
    tokenReply = () => json({ access_token: 'ya29.x', expires_in: 3600, scope: `openid ${GMAIL_SCOPE}`, id_token: idToken({ aud: 'other' }) });
    await expect(gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT))).rejects.toMatchObject({ code: 'auth' }); // QA036(4): 인증 실패는 auth
    expect(rows).toHaveLength(0);
  });

  it('다른 구글 계정이 이미 연결됨 → 409·저장 0 / 같은 계정 다시 연결은 갱신', async () => {
    reset(true);
    await gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT));
    tokenReply = goodToken({ sub: 'sub-B', email: 'b@example.com' });
    await expect(gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT))).rejects.toMatchObject({ code: 'conflict', message: gm.GMAIL_OTHER_ACCOUNT_MESSAGE });
    expect(rows.map((r) => r.externalId)).toEqual(['sub-A']);
    tokenReply = goodToken();
    await gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT));
    expect(rows).toHaveLength(1);
  });

  it('동시 콜백 두 개가 서로 다른 계정을 새로 넣으려 함 → 남는 연결은 많아야 1개, 진 쪽은 409', async () => {
    reset(true);
    // 모든 저장소 호출 사이에 양보 → 「둘 다 없음을 보고 둘 다 넣음」 순서를 일부러 만든다
    tick = () => new Promise((r) => setTimeout(r, 0));
    let n = 0;
    tokenReply = () => goodToken(n++ === 0 ? { sub: 'sub-A' } : { sub: 'sub-B', email: 'b@example.com' })();
    const res = await Promise.allSettled([gm.completeGmailConnect(USER, 'c1', gm.appTagOf(CLIENT)), gm.completeGmailConnect(USER, 'c2', gm.appTagOf(CLIENT))]);
    const userRows = rows.filter((r) => r.userId === USER);
    expect(userRows.length).toBeLessThanOrEqual(1);
    expect(res.filter((x) => x.status === 'rejected').length).toBeGreaterThanOrEqual(1);
    for (const x of res) if (x.status === 'rejected') expect((x.reason as any).code).toBe('conflict');
    if (userRows.length === 1) expect(res.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  });

  it('회원 격리: 다른 회원의 연결은 이 회원의 계정 확인에 영향 없음', async () => {
    reset(true);
    rows.push({ id: 'x', userId: OTHER_USER, externalId: 'sub-Z', username: 'z@example.com', accessToken: 'ya29.other', refreshToken: 'r', tokenExpiresAt: new Date(Date.now() + 3600e3).toISOString(), grantedScopes: [GMAIL_SCOPE], appRef: CLIENT });
    await gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT));
    expect((await gm.gmailStatus(USER)).sub).toBe('sub-A');
    expect((await gm.gmailStatus(OTHER_USER)).sub).toBe('sub-Z');
  });
});

// ---------------------------------------------------------------- 목록
describe('받은 편지함 목록(표시만, 저장 0)', () => {
  async function connected() {
    reset(true);
    await gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT));
    hits = []; storeCalls.length = 0;
  }
  it('list는 INBOX·20개·번호만(q 없음), get은 metadata·Subject/From/Date·fields로 snippet 제외 — 결과는 제목·보낸 사람·날짜만', async () => {
    await connected();
    const r = await gm.listGmailInbox(USER);
    const list = hits.find((h) => /messages\?/.test(h.url))!;
    const lu = new URL(list.url);
    expect(lu.searchParams.get('labelIds')).toBe('INBOX');
    expect(lu.searchParams.get('maxResults')).toBe('20');
    expect(lu.searchParams.get('fields')).toBe('messages/id');
    expect(lu.searchParams.has('q')).toBe(false);
    const gets = hits.filter((h) => /messages\/[^?]+\?/.test(h.url));
    expect(gets).toHaveLength(2); // 형식이 이상한 번호는 부르지 않음
    for (const g of gets) {
      const u = new URL(g.url);
      expect(u.searchParams.get('format')).toBe('metadata');
      expect(u.searchParams.getAll('metadataHeaders')).toEqual(['Subject', 'From', 'Date']);
      expect(u.searchParams.get('fields')).toBe('id,payload/headers');
      expect(g.auth).toBe('Bearer ya29.fake-access');
    }
    expect(r.sub).toBe('sub-A');
    expect(r.items).toEqual([
      { id: 'm1', subject: '제목 m1 줄바꿈', from: '보낸이 <x@example.com>', date: '2026-11-17T00:00:00.000Z' },
      { id: 'm2', subject: '제목 m2 줄바꿈', from: '보낸이 <x@example.com>', date: '2026-11-17T00:00:00.000Z' },
    ]);
    const all = JSON.stringify(r);
    expect(all).not.toContain('비밀 미리보기');
    expect(all).not.toContain('BODY');
    expect(all).not.toContain('me@example.com');
    expect(storeCalls.filter((c) => c === 'save' || c === 'update')).toEqual([]); // 목록은 저장 0
  });

  it('화면이 본 계정(expectSub)과 지금 계정이 다르면 구글 호출 전에 409', async () => {
    await connected();
    await expect(gm.listGmailInbox(USER, 'sub-OLD')).rejects.toMatchObject({ code: 'conflict' });
    expect(hits).toEqual([]);
  });

  it.each([
    ['다른 계정으로 바뀜', () => { rows[0].externalId = 'sub-B'; }, 'conflict'],
    ['연결 끊김', () => { rows = []; }, 'not_found'],
  ])('늦은 응답 사이 %s → 결과 버리고 거절', async (_n, change, code) => {
    await connected();
    onGet = (id) => { if (id === 'm2') (change as () => void)(); };
    await expect(gm.listGmailInbox(USER)).rejects.toMatchObject({ code });
  });

  it('연결 줄이 2개(정할 수 없음) → 409로 닫힘', async () => {
    await connected();
    rows.push({ ...rows[0], id: 'dup', externalId: 'sub-B' });
    await expect(gm.listGmailInbox(USER)).rejects.toMatchObject({ code: 'conflict' });
    expect(hits).toEqual([]);
  });

  it('401 → 한 번만 새 토큰 받아 다시 / 새로 받기도 invalid_grant면 재연결 표시', async () => {
    await connected();
    let first = true;
    listReply = () => { if (first) { first = false; return json({}, 401); } return json({ messages: [] }); };
    tokenReply = () => json({ access_token: 'ya29.new', expires_in: 3600 });
    expect((await gm.listGmailInbox(USER)).items).toEqual([]);
    expect(hits.filter((h) => h.url === 'https://oauth2.googleapis.com/token')).toHaveLength(1);
    listReply = () => json({}, 401);
    tokenReply = () => json({ error: 'invalid_grant' }, 400);
    await expect(gm.listGmailInbox(USER)).rejects.toMatchObject({ code: 'auth' });
    expect(storeCalls).toContain('reconnect');
  });

  it('구글 앱 키가 바뀐 뒤 토큰 만료 → 재연결 표시·토큰 요청 0', async () => {
    await connected();
    rows[0].tokenExpiresAt = new Date(Date.now() - 1000).toISOString();
    app = { clientId: 'new-client', clientSecret: 's' };
    await expect(gm.listGmailInbox(USER)).rejects.toMatchObject({ code: 'auth' });
    expect(storeCalls).toContain('reconnect');
    expect(hits.filter((h) => h.url.includes('/token'))).toHaveLength(0);
  });

  it('연결 끊기: 이 연결 줄만 삭제, 구글 호출 0(폐기 revoke 없음)', async () => {
    await connected();
    await gm.disconnectGmail(USER);
    expect(rows).toHaveLength(0);
    expect(hits).toEqual([]);
  });
});

// ---------------------------------------------------------------- 콜백 경로
describe('콜백 경로(켜짐)', () => {
  const call = (cookie: string | null, q = 'code=c&state=' + 's'.repeat(48)) => {
    const r = new NextRequest(`https://ai-work-workspace.buylife.xyz/api/oauth/google-gmail/callback?${q}`);
    if (cookie) r.cookies.set('aww_gmail_oauth', cookie);
    return cbRoute.GET(r);
  };
  it.each([
    ['쿠키 없음', null],
    ['state 다름', `${'t'.repeat(48)}.${USER}.x`],
    ['앱 표식 없음', `${'s'.repeat(48)}.${USER}`],
  ])('%s → state 오류, 회원 확인 전에 끝', async (_n, cookie) => {
    reset(true);
    const res = await call(cookie);
    expect(res.headers.get('location')).toContain('gmail_error=state');
    expect(access.calls).toBe(0);
    expect(rows).toHaveLength(0);
  });
  it('쿠키 회원 ≠ 로그인 회원 → state 오류·저장 0', async () => {
    reset(true);
    access.fn = () => ({ allowed: true, user: { id: OTHER_USER } });
    const res = await call(tagCookie());
    expect(res.headers.get('location')).toContain('gmail_error=state');
    expect(rows).toHaveLength(0);
  });
  it('정상 → connected, 쿠키 지움, 다른 계정이면 other_account', async () => {
    reset(true);
    access.fn = () => ({ allowed: true, user: { id: USER } });
    const ok = await call(tagCookie());
    expect(ok.headers.get('location')).toContain('gmail=connected');
    expect(ok.headers.get('set-cookie') ?? '').toMatch(/aww_gmail_oauth=;.*Max-Age=0/i);
    tokenReply = goodToken({ sub: 'sub-B' });
    const dup = await call(tagCookie());
    expect(dup.headers.get('location')).toContain('gmail_error=other_account');
  });
});

describe('로그에 토큰·메일 정보 0', () => {
  it('연결·목록·오류 흐름 동안 console 출력에 토큰·제목·보낸 사람·계정 번호 없음', async () => {
    const out: string[] = [];
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((k) => vi.spyOn(console, k).mockImplementation((...a: unknown[]) => { out.push(a.map(String).join(' ')); }));
    try {
      reset(true);
      await gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT));
      await gm.listGmailInbox(USER);
      listReply = () => json({}, 500);
      await gm.listGmailInbox(USER).catch(() => {});
    } finally {
      for (const s of spies) s.mockRestore();
    }
    const text = out.join('\n');
    for (const secret of ['ya29', '1//fake-refresh', '제목 m1', 'x@example.com', 'sub-A', SECRET]) expect(text).not.toContain(secret);
  });
});

// ---------------------------------------------------------------- QA036 반례(Mac msg_cf1609be1214)
describe('QA036 반례', () => {
  const raw = (h: unknown, p: unknown) => `${Buffer.from(JSON.stringify(h)).toString('base64url')}.${Buffer.from(JSON.stringify(p)).toString('base64url')}.sig`;
  it.each([
    ['aud 배열에 다른 앱, azp가 다른 앱', { aud: [CLIENT, 'other-client'], azp: 'other-client' }, null],
    ['aud 배열 여러 개인데 azp 없음', { aud: [CLIENT, 'other-client'] }, null],
    ['단일 aud인데 azp가 다른 앱', { azp: 'other-client' }, null],
    ['aud 배열 여러 개·azp가 이 앱(허용)', { aud: [CLIENT, 'other-client'], azp: CLIENT }, { sub: 'sub-A', email: 'a@example.com' }],
    ['단일 aud·azp 이 앱(회귀)', { azp: CLIENT }, { sub: 'sub-A', email: 'a@example.com' }],
  ])('(1) %s', async (_n, claims, want) => {
    reset(true);
    expect(await gm.verifyGoogleIdToken(idToken(claims), CLIENT)).toEqual(want);
  });

  it.each([
    ['header JSON null', raw(null, {})],
    ['header 배열', raw([1], {})],
    ['header 숫자', raw(5, {})],
    ['payload null', raw({ alg: 'RS256', kid: KID }, null)],
    ['payload 문자열', raw({ alg: 'RS256', kid: KID }, 'x')],
    ['base64 아님', '###.###.###'],
  ])('(4) 잘못된 형식 %s → null(예외 0)', async (_n, tok) => {
    reset(true);
    await expect(gm.verifyGoogleIdToken(tok, CLIENT)).resolves.toBeNull();
  });

  it('(4) 콜백에서 형식이 깨진 id_token → 인증 실패(server 오류 문구로 새지 않고 저장 0)', async () => {
    reset(true);
    tokenReply = () => json({ access_token: 'ya29.x', expires_in: 3600, scope: `openid ${GMAIL_SCOPE}`, id_token: raw(null, null) });
    await expect(gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT))).rejects.toMatchObject({ code: 'auth' });
    expect(rows).toHaveLength(0);
  });

  it('(2) 토큰이 아직 유효해도 회원 앱이 바뀌었으면 Gmail 호출 0·재연결 표시', async () => {
    reset(true);
    await gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT));
    hits = []; storeCalls.length = 0;
    app = { clientId: 'new-client', clientSecret: 's' };
    await expect(gm.listGmailInbox(USER)).rejects.toMatchObject({ code: 'auth' });
    expect(hits).toEqual([]);
    expect(storeCalls).toContain('reconnect');
  });

  it('(2) 토큰 갱신 중 연결이 다른 계정으로 바뀜 → Gmail 호출 0·409', async () => {
    reset(true);
    await gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT));
    rows[0].tokenExpiresAt = new Date(Date.now() - 1000).toISOString();
    hits = [];
    tokenReply = () => { rows[0].externalId = 'sub-B'; return json({ access_token: 'ya29.new', expires_in: 3600 }); };
    await expect(gm.listGmailInbox(USER)).rejects.toMatchObject({ code: 'conflict' });
    expect(hits.filter((h) => h.url.includes('gmail.googleapis.com'))).toHaveLength(0);
  });

  it('(3→F03 안 A) 저장이 「회원당 1개」 인덱스에 걸림 → 409·기존 줄·토큰 그대로·삭제 호출 0', async () => {
    reset(true);
    rows.push({ id: 'z', userId: USER, externalId: 'sub-Z', username: null, accessToken: 'ya29.keep', refreshToken: 'r', tokenExpiresAt: new Date(Date.now() + 3600e3).toISOString(), grantedScopes: [GMAIL_SCOPE], appRef: CLIENT });
    // 미리 확인을 지나친 경우(동시 콜백)를 흉내: 미리 확인 읽기는 빈 결과
    const base = fakeStore();
    let first = true;
    gm.setGmailStoreForTests({ ...base, async listAccounts(u: string) { if (first) { first = false; return []; } return base.listAccounts(u); } } as any);
    await expect(gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT))).rejects.toMatchObject({ code: 'conflict', message: gm.GMAIL_OTHER_ACCOUNT_MESSAGE });
    expect(rows.map((r) => [r.externalId, r.accessToken])).toEqual([['sub-Z', 'ya29.keep']]);
    expect(storeCalls).not.toContain('delete');
  });

  it('(3→F03) 그 밖의 저장 실패(다른 고유 조건·외래 키 등) → 일반 문구, 원문 노출 0, 409 아님', async () => {
    reset(true);
    const base = fakeStore();
    for (const error of [
      'insert or update on table "member_platform_accounts" violates foreign key constraint "member_platform_accounts_platform_fkey"',
      'duplicate key value violates unique constraint "member_platform_accounts_unique"',
      'duplicate key value violates unique constraint "member_platform_accounts_gmail_one_x"',
    ]) {
      gm.setGmailStoreForTests({ ...base, async save() { return { error, otherAccount: gm.isGmailOneAccountViolation(error) }; } } as any);
      const e: any = await gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT)).catch((x) => x);
      expect(e.code).toBe('server');
      expect(e.message).not.toContain('constraint');
    }
  });

  it('(F03) 인덱스 이름 판정은 완전 일치만', () => {
    expect(gm.isGmailOneAccountViolation('duplicate key value violates unique constraint "member_platform_accounts_gmail_one"')).toBe(true);
    for (const m of [null, undefined, '', 'duplicate key value violates unique constraint "member_platform_accounts_gmail_one_x"', 'x duplicate key value violates unique constraint "member_platform_accounts_gmail_one"', 'member_platform_accounts_gmail_one']) {
      expect(gm.isGmailOneAccountViolation(m as any)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------- QA036 정식 F03·F04·F06(Mac msg_a28485a4da2f)
describe('QA036 F04 — 401 토큰 새로 받기는 목록 전체에서 최대 1번', () => {
  async function connected() {
    reset(true);
    await gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT));
    hits = []; storeCalls.length = 0;
  }
  const tokenHits = () => hits.filter((h) => h.url === 'https://oauth2.googleapis.com/token').length;
  it('상세 조회 401 → 1번 새로 받아 그 상세만 다시, 나머지는 새 토큰으로', async () => {
    await connected();
    let firstDetail = true;
    const realFetch = fakeFetch;
    gm.setGmailFetch((async (u: string, init?: RequestInit) => {
      if (/messages\/m1\?/.test(String(u)) && firstDetail) { firstDetail = false; hits.push({ url: String(u), method: 'GET' }); return json({}, 401); }
      return (realFetch as any)(u, init);
    }) as unknown as typeof fetch);
    tokenReply = () => json({ access_token: 'ya29.new', expires_in: 3600 });
    const r = await gm.listGmailInbox(USER);
    expect(r.items.map((i) => i.id)).toEqual(['m1', 'm2']);
    expect(tokenHits()).toBe(1);
    expect(hits.filter((h) => /messages\/m2\?/.test(h.url))[0].auth).toBe('Bearer ya29.new');
  });
  it('새로 받은 뒤에도 또 401(같은 상세든 다른 상세든) → 더 받지 않고 멈춤(토큰 요청 1번)', async () => {
    await connected();
    const realFetch = fakeFetch;
    gm.setGmailFetch((async (u: string, init?: RequestInit) => {
      if (/messages\/m[12]\?/.test(String(u))) { hits.push({ url: String(u), method: 'GET' }); return json({}, 401); }
      return (realFetch as any)(u, init);
    }) as unknown as typeof fetch);
    tokenReply = () => json({ access_token: 'ya29.new', expires_in: 3600 });
    await expect(gm.listGmailInbox(USER)).rejects.toMatchObject({ code: 'auth' });
    expect(tokenHits()).toBe(1);
    expect(hits.filter((h) => /messages\/m[12]\?/.test(h.url))).toHaveLength(2); // m1 두 번(처음·새 토큰), 그 뒤 진행 안 함
  });
  it('목록 401로 이미 1번 받았으면 상세 401에서는 더 받지 않음', async () => {
    await connected();
    let listFirst = true;
    listReply = () => { if (listFirst) { listFirst = false; return json({}, 401); } return json({ messages: [{ id: 'm1' }] }); };
    const realFetch = fakeFetch;
    gm.setGmailFetch((async (u: string, init?: RequestInit) => {
      if (/messages\/m1\?/.test(String(u))) { hits.push({ url: String(u), method: 'GET' }); return json({}, 401); }
      return (realFetch as any)(u, init);
    }) as unknown as typeof fetch);
    tokenReply = () => json({ access_token: 'ya29.new', expires_in: 3600 });
    await expect(gm.listGmailInbox(USER)).rejects.toMatchObject({ code: 'auth' });
    expect(tokenHits()).toBe(1);
  });
});

describe('QA036 F06 — 모르는 키 번호: 쿨다운 안에서 공개 키 목록 1번만 다시 받기', () => {
  it('캐시 k1 → 서버가 k2로 바뀜 → k2 토큰은 1번 다시 받아 통과 / 곧바로 엉뚱한 키 번호는 다시 받지 않고 null / 쿨다운 뒤에는 1번 더', async () => {
    reset(true);
    const kp2 = generateKeyPairSync('rsa', { modulusLength: 2048 });
    let serve: 'k1' | 'k2' = 'k1';
    let certHits = 0;
    gm.setGmailFetch((async (u: string) => {
      if (String(u).startsWith('https://www.googleapis.com/oauth2/v3/certs')) {
        certHits++;
        const k = serve === 'k1' ? { ...jwk, kid: KID } : { ...(kp2.publicKey.export({ format: 'jwk' }) as object), kid: 'k2' };
        return json({ keys: [{ ...k, alg: 'RS256', use: 'sig' }] }, 200, { 'cache-control': 'max-age=3600' });
      }
      return json({}, 404);
    }) as unknown as typeof fetch);
    const t0 = Date.now();
    expect(await gm.verifyGoogleIdToken(idToken({}), CLIENT, t0)).not.toBeNull();
    expect(certHits).toBe(1);
    serve = 'k2';
    const k2tok = idToken({}, { kid: 'k2', key: kp2.privateKey });
    expect(await gm.verifyGoogleIdToken(k2tok, CLIENT, t0 + 1000)).toMatchObject({ sub: 'sub-A' });
    expect(certHits).toBe(2);
    expect(await gm.verifyGoogleIdToken(idToken({}, { kid: 'random-1' }), CLIENT, t0 + 2000)).toBeNull();
    expect(await gm.verifyGoogleIdToken(idToken({}, { kid: 'random-2' }), CLIENT, t0 + 3000)).toBeNull();
    expect(certHits).toBe(2); // 쿨다운 안: 다시 받지 않음
    expect(await gm.verifyGoogleIdToken(idToken({}, { kid: 'random-3' }), CLIENT, t0 + 1000 + gm.GMAIL_JWKS_REFETCH_COOLDOWN_MS + 1)).toBeNull();
    expect(certHits).toBe(3); // 쿨다운 뒤 1번
  });
  it('강제 다시 받기가 실패해도 예외 없이 null, 쿨다운은 그대로 적용', async () => {
    reset(true);
    let certHits = 0;
    let fail = false;
    gm.setGmailFetch((async (u: string) => {
      if (String(u).startsWith('https://www.googleapis.com/oauth2/v3/certs')) {
        certHits++;
        if (fail) throw new Error('network');
        return json({ keys: [{ ...jwk, kid: KID, alg: 'RS256' }] }, 200, { 'cache-control': 'max-age=3600' });
      }
      return json({}, 404);
    }) as unknown as typeof fetch);
    const t0 = Date.now();
    await gm.verifyGoogleIdToken(idToken({}), CLIENT, t0);
    fail = true;
    await expect(gm.verifyGoogleIdToken(idToken({}, { kid: 'x1' }), CLIENT, t0 + 10)).resolves.toBeNull();
    await expect(gm.verifyGoogleIdToken(idToken({}, { kid: 'x2' }), CLIENT, t0 + 20)).resolves.toBeNull();
    expect(certHits).toBe(2);
  });
});

// (F03 이전 방식의 「저장 뒤 재확인·조건부 삭제」 시험은 부분 고유 인덱스 방식으로 바뀌며 제거 — 실제 DB 동작은 gmailF03Db.test.ts)

// ---------------------------------------------------------------- QA036 F02 잔여(Mac msg_85a81e367fe4)
describe('QA036 F02 잔여 — 토큰 갱신 응답을 기다리는 사이 앱·연결이 바뀜', () => {
  async function expiredConnected() {
    reset(true);
    await gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT));
    rows[0].tokenExpiresAt = new Date(Date.now() - 1000).toISOString();
    hits = []; storeCalls.length = 0;
  }
  const gmailHits = () => hits.filter((h) => h.url.includes('gmail.googleapis.com')).length;
  it('갱신 응답 대기 중 회원 앱이 새 앱으로 바뀜(계정 sub 그대로) → 새 토큰 저장 0·Gmail 0·재연결', async () => {
    await expiredConnected();
    tokenReply = () => { app = { clientId: 'new-client', clientSecret: 's' }; return json({ access_token: 'ya29.new', expires_in: 3600 }); };
    await expect(gm.listGmailInbox(USER)).rejects.toMatchObject({ code: 'auth' });
    expect(storeCalls.filter((c) => c === 'update')).toHaveLength(0);
    expect(rows[0].accessToken).toBe('ya29.fake-access');
    expect(gmailHits()).toBe(0);
  });
  it('갱신 응답 대기 중 같은 계정이 다시 연결됨(줄의 앱 표시 변경) → 새 토큰 저장 0·Gmail 0', async () => {
    await expiredConnected();
    tokenReply = () => { rows[0].appRef = 'new-client'; app = { clientId: 'new-client', clientSecret: 's' }; return json({ access_token: 'ya29.new', expires_in: 3600 }); };
    await expect(gm.listGmailInbox(USER)).rejects.toMatchObject({ code: 'auth' });
    expect(storeCalls.filter((c) => c === 'update')).toHaveLength(0);
    expect(gmailHits()).toBe(0);
  });
  it('갱신 응답 대기 중 연결이 끊김 → 저장 0·Gmail 0', async () => {
    await expiredConnected();
    tokenReply = () => { rows = []; return json({ access_token: 'ya29.new', expires_in: 3600 }); };
    await expect(gm.listGmailInbox(USER)).rejects.toMatchObject({ code: 'not_found' });
    expect(storeCalls.filter((c) => c === 'update')).toHaveLength(0);
    expect(gmailHits()).toBe(0);
  });
  it('회귀: 아무것도 안 바뀌면 갱신 저장 1·목록 정상', async () => {
    await expiredConnected();
    tokenReply = () => json({ access_token: 'ya29.new', expires_in: 3600 });
    expect((await gm.listGmailInbox(USER)).items).toHaveLength(2);
    expect(storeCalls.filter((c) => c === 'update')).toHaveLength(1);
  });
});


// ---------------------------------------------------------------- A2-1 고른 메일 → 받은 업무(서버 단계, DB는 가짜 — 실제 DB 함수는 gmailAddDb.test.ts)
describe('A2-1 addGmailToInbox(서버)', () => {
  async function connected() {
    reset(true);
    await gm.completeGmailConnect(USER, 'code', gm.appTagOf(CLIENT));
    hits = []; storeCalls.length = 0; adds.length = 0;
  }
  it('꺼짐 → DB·구글 0', async () => {
    reset(false);
    await expect(gm.addGmailToInbox(USER, { messageId: 'm1', title: 't', expectSub: 'sub-A' })).rejects.toMatchObject({ code: 'off' });
    expect(storeCalls).toEqual([]);
    expect(hits).toEqual([]);
  });
  it.each([
    ['메시지 번호 형식 위반', { messageId: '../x', title: 't', expectSub: 'sub-A' }, 'bad_request'],
    ['제목 비어 있음', { messageId: 'm1', title: '   ', expectSub: 'sub-A' }, 'bad_request'],
    ['제목 201자', { messageId: 'm1', title: 'x'.repeat(201), expectSub: 'sub-A' }, 'bad_request'],
    ['계정 확인값 없음', { messageId: 'm1', title: 't', expectSub: '' }, 'bad_request'],
    ['화면이 본 계정과 지금 계정이 다름', { messageId: 'm1', title: 't', expectSub: 'sub-OLD' }, 'conflict'],
  ])('%s → 거절, 구글·넣기 0', async (_n, input, code) => {
    await connected();
    await expect(gm.addGmailToInbox(USER, input as any)).rejects.toMatchObject({ code });
    expect(hits.filter((h) => h.url.includes('gmail.googleapis.com'))).toHaveLength(0);
    expect(adds).toHaveLength(0);
  });
  it('성공: metadata·fields=id로 소유 확인(머리글 0), 서버가 해시·링크 계산, 제목 앞뒤 공백 제거, 화면이 보낸 URL 없음', async () => {
    await connected();
    const r = await gm.addGmailToInbox(USER, { messageId: 'm1', title: '  견적 회신하기  ', expectSub: 'sub-A', sourceUrl: 'https://evil.example' } as any);
    expect(r).toEqual({ status: 'added', inboxId: 'inbox-1' });
    const g = hits.filter((h) => h.url.includes('gmail.googleapis.com'));
    expect(g).toHaveLength(1);
    const u = new URL(g[0].url);
    expect(u.pathname.endsWith('/messages/m1')).toBe(true);
    expect(u.searchParams.get('format')).toBe('metadata');
    expect(u.searchParams.get('fields')).toBe('id');
    expect(u.searchParams.getAll('metadataHeaders')).toEqual([]);
    expect(adds).toEqual([{ userId: USER, accountHash: gm.gmailAccountHash('sub-A'), messageId: 'm1', title: '견적 회신하기', sourceUrl: 'https://mail.google.com/mail/u/0/#all/m1' }]);
    expect(adds[0].accountHash).not.toContain('sub-A');
    expect(JSON.stringify(adds)).not.toContain('a@example.com');
  });
  it('구글이 그 메일 없음(404) → not_found·넣기 0', async () => {
    await connected();
    const realFetch = fakeFetch;
    gm.setGmailFetch((async (u: string, init?: RequestInit) => {
      if (/messages\/m1\?/.test(String(u))) { hits.push({ url: String(u), method: 'GET' }); return json({ error: { code: 404 } }, 404); }
      return (realFetch as any)(u, init);
    }) as unknown as typeof fetch);
    await expect(gm.addGmailToInbox(USER, { messageId: 'm1', title: 't', expectSub: 'sub-A' })).rejects.toMatchObject({ code: 'not_found' });
    expect(adds).toHaveLength(0);
  });
  it('구글 응답의 id가 다르면 not_found·넣기 0', async () => {
    await connected();
    const realFetch = fakeFetch;
    gm.setGmailFetch((async (u: string, init?: RequestInit) => {
      if (/messages\/m1\?/.test(String(u))) return json({ id: 'other' });
      return (realFetch as any)(u, init);
    }) as unknown as typeof fetch);
    await expect(gm.addGmailToInbox(USER, { messageId: 'm1', title: 't', expectSub: 'sub-A' })).rejects.toMatchObject({ code: 'not_found' });
    expect(adds).toHaveLength(0);
  });
  it('소유 확인 응답을 기다리는 사이 연결이 다른 계정으로 바뀜 → conflict·넣기 0', async () => {
    await connected();
    onGet = () => { rows[0].externalId = 'sub-B'; };
    await expect(gm.addGmailToInbox(USER, { messageId: 'm1', title: 't', expectSub: 'sub-A' })).rejects.toMatchObject({ code: 'conflict' });
    expect(adds).toHaveLength(0);
  });
});
