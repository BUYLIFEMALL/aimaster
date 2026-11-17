// @vitest-environment jsdom
// 2026-11-17 주인님 지시: /settings/keys 「📅 구글 캘린더 연결」 칸에 연결 상태 + 「캘린더 연동 화면 열기」 버튼.
// 실제 React로 그림. 상태는 기존 calState 읽기 rpc만(모의), 서버·DB 없음. 늦게 온 이전 응답·화면 해제 뒤 응답은 반영 0.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const h = vi.hoisted(() => ({ pending: [] as { name: string; resolve: (v: unknown) => void; reject: (e: unknown) => void }[] }));
vi.mock('../../src/lib/standaloneRpc.ts', async (orig) => ({
  ...(await orig<typeof import('../../src/lib/standaloneRpc.ts')>()),
  rpc: (name: string) => new Promise((resolve, reject) => h.pending.push({ name, resolve, reject })),
}));
const { CalendarConnStatus } = await import('@/app/settings/keys/KeysForm');

const st = (g: Record<string, unknown>, feed: unknown = null) => ({ google: { hasApp: false, connected: false, needsReconnect: false, email: null, redirectUri: '', hasSent: false, ...g }, feed, databases: [] });
let root: Root | null = null;
let el: HTMLDivElement;
const render = (tag: string) => act(() => root!.render(createElement(CalendarConnStatus, { reloadTag: tag })));
function mount(tag = 't1') { el = document.createElement('div'); document.body.appendChild(el); root = createRoot(el); render(tag); }
async function settle(i: number, v: unknown, fail = false) { await act(async () => { (fail ? h.pending[i].reject : h.pending[i].resolve)(v); await Promise.resolve(); }); }
afterEach(() => { act(() => root?.unmount()); root = null; document.body.innerHTML = ''; h.pending = []; });

describe('키 화면 캘린더 연결 상태', () => {
  it('기존 calState만 부르고, 「캘린더 연동 화면 열기」는 /calendar-sync로', () => {
    mount();
    expect(h.pending.map((p) => p.name)).toEqual(['calState']);
    expect(el.textContent).toContain('확인 중');
    const a = [...el.querySelectorAll('a')].find((x) => x.textContent?.includes('캘린더 연동 화면 열기'));
    expect(a?.getAttribute('href')).toBe('/calendar-sync');
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
  it('불러오기 실패 → 안내, 키를 바꾸면(reloadTag) 다시 읽고 늦게 온 이전 응답은 무시', async () => {
    mount('t1');
    await settle(0, new Error('x'), true);
    expect(el.textContent).toContain('확인하지 못했습니다');
    expect(el.textContent).not.toContain('아직 연결 안 됨'); // 읽기 실패를 미연결로 단정하지 않음
    const again = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('다시 확인'))!;
    act(() => again.click());
    expect(h.pending.length).toBe(2);
    await settle(1, st({ hasApp: true }));
    expect(el.textContent).toContain('아직 연결 안 됨');
    render('t2');
    render('t3');
    expect(h.pending.length).toBe(4);
    await settle(3, st({ hasApp: true, connected: true, email: 'new@example.com' }));
    await settle(2, st({}));
    expect(el.textContent).toContain('new@example.com');
    expect(el.textContent).not.toContain('구글 앱 키를 먼저');
  });
  it('화면 해제 뒤 응답은 오류 없이 무시', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    mount();
    act(() => root!.unmount()); root = null;
    await settle(0, st({ hasApp: true, connected: true }));
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });
});
