// @vitest-environment jsdom
// WS-20261117-25 E4 Gmail OFF 배선 — 화면 쪽 호출 묶음(boundGmailApi) + 받은 업무 화면(InboxBoard) 연결 회귀.
// 실제 standaloneRpc(fetch 경로)를 쓰고 fetch만 가짜. 실네트워크·DB·구글 0.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const { boundGmailApi } = await import('../../src/app/inbox/gmailApi.ts');
const { InboxBoard } = await import('../../src/app/inbox/InboxBoard.tsx');
const { EXPECTED_ACCOUNT_HEADER, ACCOUNT_CHANGED_NAME } = await import('../../src/lib/accountGuard.ts');
const { RELOGIN_MESSAGE } = await import('../../src/lib/standaloneRpc.ts');

type Sent = { url: string; headers: Record<string, string>; body: any };
let sent: Sent[] = [];
let reply: (s: Sent) => Response | Promise<Response> = () => json({ ok: true });
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
const UUID1 = '11111111-2222-4333-8444-555555555555';
beforeEach(() => {
  sent = [];
  (globalThis as any).fetch = async (url: string, init: any) => {
    const s = { url: String(url), headers: init?.headers ?? {}, body: init?.body ? JSON.parse(init.body) : undefined };
    sent.push(s);
    return reply(s);
  };
  document.getElementById('aww-relogin-banner')?.remove();
});

const api = boundGmailApi('uA');
const ADD = { messageId: 'm1', title: 't', expectSub: 'sub-A' };
const run = (p: Promise<unknown>) => p.then((v) => ({ v }), (e) => ({ e }));

describe('4명령 모두 기대 계정 머리글·명령 이름', () => {
  it.each([
    ['status', () => api.status(), 'gmailStatus', { ok: true, connected: false, email: null, sub: null }],
    ['list', () => api.list('sub-A'), 'gmailList', { ok: true, sub: 'sub-A', email: null, items: [] }],
    ['add', () => api.add(ADD), 'gmailAdd', { ok: true, status: 'added', inboxId: UUID1 }],
    ['disconnect', () => api.disconnect(), 'gmailDisconnect', { ok: true }],
  ])('%s', async (_n, fn, name, ok) => {
    reply = () => json(ok);
    await (fn as () => Promise<unknown>)();
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe(`/api/rpc/${name}`);
    expect(sent[0].headers[EXPECTED_ACCOUNT_HEADER]).toBe('uA');
  });
  it('넣기 본문은 정해진 3칸만', async () => {
    reply = () => json({ ok: true, status: 'existing', inboxId: UUID1 });
    await api.add({ ...ADD, userId: 'x' } as any);
    expect(sent[0].body).toEqual(ADD);
  });
  it.each([[''], ['  '], [null], [undefined]])('계정 id가 비면(%j) 요청 0 → account_changed', async (k) => {
    const r: any = await run(boundGmailApi(k as any).status());
    expect(r.e.code).toBe('account_changed');
    expect(sent).toHaveLength(0);
  });
});

describe('오류 변환', () => {
  it('409 계정 바뀜 → account_changed(Gmail conflict와 다름)', async () => {
    reply = () => json({ name: ACCOUNT_CHANGED_NAME, message: 'x' }, 409);
    for (const fn of [() => api.status(), () => api.add(ADD)]) expect(((await run(fn())) as any).e.code).toBe('account_changed');
  });
  it('200 봉투 conflict → conflict(계정 바뀜으로 단정하지 않음)', async () => {
    reply = () => json({ ok: false, code: 'conflict', message: 'RAW' });
    const r: any = await run(api.add(ADD));
    expect(r.e.code).toBe('conflict');
    expect(r.e.message).not.toContain('RAW');
  });
  it('401 → auth(다시 로그인 띠)', async () => {
    reply = () => json({ error: 'x' }, 401);
    const r: any = await run(api.list('sub-A'));
    expect(r.e.code).toBe('auth');
    expect(r.e.message).toBe(RELOGIN_MESSAGE);
    expect(document.getElementById('aww-relogin-banner')).not.toBeNull();
  });
  it.each(['off', 'auth', 'bad_request', 'forbidden', 'not_found', 'server', 'unknown'])('봉투 code %s → 같은 code, 넘어온 문구 무시', async (code) => {
    reply = () => json({ ok: false, code, message: 'RAW_MSG', extra: 'RAW_EXTRA' });
    const r: any = await run(api.list('sub-A'));
    expect(r.e.code).toBe(code);
    expect(JSON.stringify(r.e)).not.toContain('RAW');
  });
  const broken: [string, () => Response | Promise<Response>][] = [
    ['네트워크 실패', () => { throw new TypeError('fetch failed'); }],
    ['500', () => json({ errorId: 'e', message: 'RAW' }, 500)],
    ['502 HTML', () => new Response('<html>bad</html>', { status: 502 })],
    ['200 JSON 아님', () => new Response('not json', { status: 200 })],
    ['200 배열', () => json([1])],
    ['모르는 code', () => json({ ok: false, code: 'weird', message: 'RAW' })],
    ['ok 칸 없음', () => json({ status: 'added', inboxId: UUID1 })],
    ['성공인데 status 이상', () => json({ ok: true, status: 'done', inboxId: UUID1 })],
    ['성공인데 inboxId UUID 아님', () => json({ ok: true, status: 'added', inboxId: 'x' })],
  ];
  it.each(broken)('넣기 %s → 결과 모름(code 없음)·재전송 0', async (_n, r) => {
    reply = r;
    const out: any = await run(api.add(ADD));
    expect(out.e).toEqual({});
    expect(sent).toHaveLength(1);
  });
  it.each(broken.slice(0, 6))('읽기(list) %s → server', async (_n, r) => {
    reply = r;
    expect(((await run(api.list('sub-A'))) as any).e.code).toBe('server');
  });
  it('목록 항목 모양 이상·21개 → server', async () => {
    reply = () => json({ ok: true, sub: 's', email: null, items: [{ id: 1 }] });
    expect(((await run(api.list('s'))) as any).e.code).toBe('server');
    reply = () => json({ ok: true, sub: 's', email: null, items: Array.from({ length: 21 }, (_, i) => ({ id: `m${i}`, subject: 's', from: 'f', date: null })) });
    expect(((await run(api.list('s'))) as any).e.code).toBe('server');
  });
});

// ---------------------------------------------------------------- 받은 업무 화면 연결 회귀
describe('InboxBoard 연결', () => {
  let root: Root | null = null;
  let el: HTMLDivElement;
  afterEach(() => { act(() => root?.unmount()); root = null; el?.remove(); });
  const names = () => sent.map((s) => s.url.replace('/api/rpc/', ''));
  beforeEach(() => {
    reply = (s) => {
      const n = s.url.replace('/api/rpc/', '');
      if (n === 'workInboxDatabases') return json({ databases: [], defaultId: null });
      if (n === 'workInboxList') return json({ items: [] });
      if (n === 'gmailStatus') return json({ ok: true, connected: false, email: null, sub: null });
      return json({});
    };
  });
  async function mount(props: Record<string, unknown>, strict = false) {
    el = document.createElement('div');
    document.body.appendChild(el);
    root = createRoot(el);
    const node = () => createElement(InboxBoard, props as any);
    await act(async () => { root!.render(strict ? createElement(StrictMode, null, node()) : node()); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    return async (p: Record<string, unknown>) => {
      await act(async () => { root!.render(strict ? createElement(StrictMode, null, createElement(InboxBoard, p as any)) : createElement(InboxBoard, p as any)); });
      await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    };
  }
  it('gmailOn 없음(기본) → 패널 0·Gmail 호출 0, 기존 받은 업무 호출은 그대로', async () => {
    await mount({ accountKey: 'uA' });
    expect(el.querySelector('[data-testid="gmail-panel"]')).toBeNull();
    expect(names().some((n) => n.startsWith('gmail'))).toBe(false);
    expect(names()).toEqual(expect.arrayContaining(['workInboxDatabases', 'workInboxList']));
  });
  it('gmailOn true여도 accountKey 없음 → 패널·Gmail 호출 0', async () => {
    await mount({ gmailOn: true });
    expect(names().some((n) => n.startsWith('gmail'))).toBe(false);
  });
  it('gmailOn true → 상태 확인 1번(같은 계정으로 다시 그려도 반복 0), 패널 보임', async () => {
    const rerender = await mount({ accountKey: 'uA', gmailOn: true });
    expect(el.querySelector('[data-testid="gmail-panel"]')).not.toBeNull();
    await rerender({ accountKey: 'uA', gmailOn: true });
    await rerender({ accountKey: 'uA', gmailOn: true });
    expect(names().filter((n) => n === 'gmailStatus')).toHaveLength(1);
    expect(sent.find((s) => s.url.endsWith('gmailStatus'))!.headers[EXPECTED_ACCOUNT_HEADER]).toBe('uA');
  });
  it('StrictMode에서도 화면에 남는 상태 확인 결과는 하나(이전 세대 응답 버림)', async () => {
    await mount({ accountKey: 'uA', gmailOn: true }, true);
    expect(el.querySelectorAll('[data-testid="gmail-panel"]')).toHaveLength(1);
    expect(el.textContent).toContain('Gmail이 연결돼 있지 않습니다');
  });
  it('계정이 바뀌면 새 계정으로 다시 확인', async () => {
    const rerender = await mount({ accountKey: 'uA', gmailOn: true });
    await rerender({ accountKey: 'uB', gmailOn: true });
    const st = sent.filter((s) => s.url.endsWith('gmailStatus'));
    expect(st.map((s) => s.headers[EXPECTED_ACCOUNT_HEADER])).toEqual(['uA', 'uB']);
  });
  it('서버가 off라고 답하면 패널 숨김·이후 Gmail 호출 0', async () => {
    reply = (s) => (s.url.endsWith('gmailStatus') ? json({ ok: false, code: 'off', message: 'x' }) : s.url.endsWith('workInboxList') ? json({ items: [] }) : json({ databases: [], defaultId: null }));
    await mount({ accountKey: 'uA', gmailOn: true });
    expect(el.querySelector('[data-testid="gmail-panel"]')).toBeNull();
    expect(names().filter((n) => n.startsWith('gmail'))).toEqual(['gmailStatus']);
  });
});
