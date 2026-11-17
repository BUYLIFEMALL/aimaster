// @vitest-environment jsdom
// 2026-11-17 WS-20261117-18 주인님 지시: /settings/keys 「📅 구글 캘린더 연결」 칸에 연결 상태 + 「캘린더 연동 화면 열기」 버튼.
// QA018 P2(Mac msg_ed20ad8d6777): 서버가 확인한 회원 id를 기대 계정으로 실어 읽기(빈 id면 요청 0, 409면 이전 연결 정보 숨김+새로고침),
// 결과는 (계정, reloadTag)가 정확히 같을 때만 그림 — 바뀐 직후 새 응답 전에는 이전 상태·계정 주소 미표시, 늦은 응답·해제 뒤 응답 폐기.
// 실제 React, rpc만 모의(서버·DB·외부 없음).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const h = vi.hoisted(() => ({ pending: [] as { name: string; opts?: { expectedAccount?: string | null }; resolve: (v: unknown) => void; reject: (e: unknown) => void }[] }));
vi.mock('../../src/lib/standaloneRpc.ts', async (orig) => ({
  ...(await orig<typeof import('../../src/lib/standaloneRpc.ts')>()),
  rpc: (name: string, _b?: unknown, opts?: { expectedAccount?: string | null }) => new Promise((resolve, reject) => h.pending.push({ name, opts, resolve, reject })),
}));
const { CalendarConnStatus } = await import('@/app/settings/keys/KeysForm');
const { AccountChangedError } = await import('@/lib/standaloneRpc');

const st = (g: Record<string, unknown>, feed: unknown = null) => ({ google: { hasApp: false, connected: false, needsReconnect: false, email: null, redirectUri: '', hasSent: false, ...g }, feed, databases: [] });
let root: Root | null = null;
let el: HTMLDivElement;
// 계정 인자를 생략하면 'uA', undefined를 명시하면 그대로 undefined(기본값 매개변수는 undefined를 덮어쓰므로 쓰지 않음)
const render = (tag: string, ...acc: (string | null | undefined)[]) => act(() => root!.render(createElement(CalendarConnStatus, { reloadTag: tag, accountKey: acc.length ? acc[0] : 'uA' })));
function mount(tag = 't1', ...acc: (string | null | undefined)[]) { el = document.createElement('div'); document.body.appendChild(el); root = createRoot(el); render(tag, ...acc); }
async function settle(i: number, v: unknown, fail = false) { await act(async () => { (fail ? h.pending[i].reject : h.pending[i].resolve)(v); await Promise.resolve(); }); }
const link = () => [...el.querySelectorAll('a')].find((x) => x.textContent?.includes('캘린더 연동 화면 열기'));
afterEach(() => { act(() => root?.unmount()); root = null; document.body.innerHTML = ''; h.pending = []; });

describe('키 화면 캘린더 연결 상태', () => {
  it('기존 calState만, 기대 계정(서버 확인 id)을 실어 부르고, 「캘린더 연동 화면 열기」는 /calendar-sync', () => {
    mount();
    expect(h.pending.map((p) => p.name)).toEqual(['calState']);
    expect(h.pending[0].opts?.expectedAccount).toBe('uA');
    expect(el.textContent).toContain('확인 중');
    expect(link()?.getAttribute('href')).toBe('/calendar-sync');
  });

  it.each([
    ['구글 앱 키 없음', st({}), '구글 앱 키'],
    ['앱 키는 있고 연결 전', st({ hasApp: true }), '아직 연결 안 됨'],
    ['연결됨(계정 표시)', st({ hasApp: true, connected: true, email: 'me@example.com' }), 'me@example.com'],
    ['다시 연결 필요', st({ hasApp: true, needsReconnect: true }), '다시 연결'],
  ])('%s', async (_n, v, text) => {
    mount();
    await settle(0, v);
    expect(el.textContent).toContain(text);
  });

  it('간편 구독이 켜져 있으면 함께 표시', async () => {
    mount();
    await settle(0, st({ hasApp: true }, { dbs: [{ id: 'd1' }, { id: 'd2' }], updatedTime: 1 }));
    expect(el.textContent).toContain('간편 구독 켜짐');
  });

  it('읽기 실패는 미연결로 단정하지 않고 「다시 확인」, 누르면 다시 읽음', async () => {
    mount();
    await settle(0, new Error('x'), true);
    expect(el.textContent).toContain('확인하지 못했습니다');
    expect(el.textContent).not.toContain('아직 연결 안 됨');
    const again = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('다시 확인'))!;
    act(() => again.click());
    expect(h.pending.length).toBe(2);
    await settle(1, st({ hasApp: true }));
    expect(el.textContent).toContain('아직 연결 안 됨');
  });

  it.each([['빈 문자열', ''], ['null', null], ['undefined', undefined], ['공백', '   ']])('계정 id %s → 요청 0, 상태 단정 없이 새로고침 안내', (_n, id) => {
    mount('t1', id as string | null | undefined);
    expect(h.pending.length).toBe(0);
    expect(el.textContent).toContain('새로고침');
    expect(el.textContent).not.toContain('아직 연결 안 됨');
    expect(link()?.getAttribute('href')).toBe('/calendar-sync');
  });

  it('서버 409(계정 바뀜) → 이전 연결 정보 숨기고 새로고침 안내(오류·미연결과 구분)', async () => {
    mount('t1');
    await settle(0, st({ hasApp: true, connected: true, email: 'a@example.com' }, { dbs: [{ id: 'd1' }] }));
    expect(el.textContent).toContain('a@example.com');
    render('t2');
    await settle(1, new AccountChangedError(), true);
    expect(el.textContent).not.toContain('a@example.com');
    expect(el.textContent).not.toContain('간편 구독 켜짐');
    expect(el.textContent).toContain('다른 계정으로');
    expect(el.textContent).not.toContain('확인하지 못했습니다');
    expect(el.textContent).not.toContain('아직 연결 안 됨');
  });

  it('키를 바꾼 직후(reloadTag) 새 응답 전에는 이전 계정 주소·구독을 즉시 숨기고 「확인 중」', async () => {
    mount('t1');
    await settle(0, st({ hasApp: true, connected: true, email: 'old@example.com' }, { dbs: [{ id: 'd1' }] }));
    render('t2');
    expect(el.textContent).not.toContain('old@example.com');
    expect(el.textContent).not.toContain('간편 구독 켜짐');
    expect(el.textContent).toContain('확인 중');
  });

  it('계정 A→B: B로 바뀐 즉시 A 상태 숨김, 늦게 온 A 응답(성공·실패) 폐기, B 요청은 기대 계정 B', async () => {
    mount('t1', 'uA');
    const a = 0;
    render('t1', 'uB');
    expect(h.pending[1]?.opts?.expectedAccount).toBe('uB');
    await settle(a, st({ hasApp: true, connected: true, email: 'a@example.com' }));
    expect(el.textContent).not.toContain('a@example.com');
    expect(el.textContent).toContain('확인 중');
    await settle(1, st({ hasApp: true, connected: true, email: 'b@example.com' }));
    expect(el.textContent).toContain('b@example.com');
  });

  it('여러 번 키를 바꾸면 마지막 요청만 반영(늦게 온 이전 응답 폐기)', async () => {
    mount('t1');
    render('t2');
    render('t3');
    expect(h.pending.length).toBe(3);
    await settle(2, st({ hasApp: true, connected: true, email: 'new@example.com' }));
    await settle(1, st({}));
    await settle(0, new Error('old'), true);
    expect(el.textContent).toContain('new@example.com');
    expect(el.textContent).not.toContain('구글 앱 키를 먼저');
    expect(el.textContent).not.toContain('확인하지 못했습니다');
  });

  it('화면 해제 뒤 응답은 오류 없이 폐기', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    mount();
    act(() => root!.unmount()); root = null;
    await settle(0, st({ hasApp: true, connected: true }));
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });
});
