// @vitest-environment jsdom
// 2026-11-17 WS-20261117-17 — 워크스페이스 안 영수증 화면(ReceiptsView)·공용 ReceiptsBoard를 실제 React로 jsdom에 그려 확인.
// QA017 P1(Mac msg_7ba69f851b09): 계정 A→B·로그아웃 때 A 자료 즉시 숨김, 늦게 온 A 응답(성공·실패)·화면 해제 뒤 응답은 상태 변경 0,
// StrictMode 두 번 실행에서도 마지막 요청만 반영. rpc·세션만 모의(서버·DB 없음). jsdom은 배치·색을 계산하지 않음 — 시각 판정 아님.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, StrictMode, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const h = vi.hoisted(() => ({
  pending: [] as { name: string; resolve: (v: unknown) => void; reject: (e: unknown) => void }[],
  session: { userId: 'uA' as string | null },
}));
vi.mock('../../src/lib/standaloneRpc.ts', () => ({
  rpc: (name: string) => new Promise((resolve, reject) => h.pending.push({ name, resolve, reject })),
}));
vi.mock('../../src/litpage/web/lib/store/session.ts', () => ({ useSession: (sel: (s: typeof h.session) => unknown) => sel(h.session) }));

const { ReceiptsView } = await import('../../src/litpage/web/features/receipts/ReceiptsView.tsx');
const { ReceiptsBoard } = await import('../../src/app/receipts/ReceiptsBoard.tsx');

const stateOf = (count: number) => ({
  profile: null, partners: [], items: [], docs: [], month: '2026-11', evidence: [],
  summary: { count, supply: 0, vat: 0, total: 0 }, retentionDays: 365,
});
let root: Root | null = null;
let el: HTMLDivElement;
function mount(node: ReturnType<typeof createElement>) {
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
  act(() => root!.render(node));
}
const rerender = (node: ReturnType<typeof createElement>) => act(() => root!.render(node));
const states = () => h.pending.filter((p) => p.name === 'rcptState');
async function settle(p: (typeof h.pending)[number], v: unknown, fail = false) {
  await act(async () => { (fail ? p.reject : p.resolve)(v); await Promise.resolve(); });
}
afterEach(() => { act(() => root?.unmount()); root = null; document.body.innerHTML = ''; h.pending = []; h.session.userId = 'uA'; });

describe('워크스페이스 안 영수증 화면', () => {
  it('제목과 기존 ReceiptsBoard(첫 상태 「불러오는 중…」)를 그리고, 기존 회원 인가 rpc(rcpt*)만 부른다', () => {
    mount(createElement(ReceiptsView));
    expect(el.querySelector('.aww-receipts-view')).not.toBeNull();
    expect(el.querySelector('h1')?.textContent).toBe('영수증·세금계산서');
    expect(el.textContent).toContain('불러오는 중');
    expect(h.pending.length).toBeGreaterThan(0);
    expect(h.pending.every((p) => p.name.startsWith('rcpt'))).toBe(true);
    expect(el.querySelector('.aww-guide-back')).toBeNull();
  });

  it('QA017 P1: 계정 A→B — 늦게 온 A 응답은 버리고 B 자료만', async () => {
    mount(createElement(ReceiptsView));
    const a = states()[0];
    h.session.userId = 'uB';
    rerender(createElement(ReceiptsView));
    const b = states().find((p) => p !== a)!;
    expect(b).toBeDefined();
    await settle(a, stateOf(7));
    expect(el.textContent).not.toContain('7건');
    await settle(b, stateOf(3));
    expect(el.textContent).toContain('3건');
  });

  it('QA017 P1: A 자료가 보이던 중 로그아웃 → 즉시 숨김, 다시 A로 와도 옛 자료 없이 새로 불러옴', async () => {
    mount(createElement(ReceiptsView));
    await settle(states()[0], stateOf(7));
    expect(el.textContent).toContain('7건');
    h.session.userId = null;
    rerender(createElement(ReceiptsView));
    expect(el.textContent).not.toContain('7건');
    expect(el.querySelector('.rc')).toBeNull();
  });

  it('QA017 P1: 화면 해제 뒤 늦은 응답(성공·실패)은 상태 변경 0(오류 없음)', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    mount(createElement(ReceiptsView));
    const [a] = states();
    act(() => root!.unmount());
    root = null;
    await settle(a, stateOf(7));
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it('QA017 P1: StrictMode(효과 두 번) — 먼저 보낸 요청이 늦게 와도 마지막 요청 결과만', async () => {
    mount(createElement(StrictMode, null, createElement(ReceiptsView)));
    const all = states();
    expect(all.length).toBeGreaterThanOrEqual(2);
    const last = all[all.length - 1];
    await settle(last, stateOf(3));
    for (const p of all.slice(0, -1)) await settle(p, stateOf(7));
    expect(el.textContent).toContain('3건');
    expect(el.textContent).not.toContain('7건');
  });

  it('QA017 P1: 공용 ReceiptsBoard 자체(별도 /receipts 페이지도 씀) — 같은 화면에서 accountKey A→B면 A 자료 즉시 숨김', async () => {
    mount(createElement(ReceiptsBoard, { accountKey: 'uA' }));
    await settle(states()[0], stateOf(7));
    expect(el.textContent).toContain('7건');
    const before = states().length;
    rerender(createElement(ReceiptsBoard, { accountKey: 'uB' }));
    expect(el.textContent).not.toContain('7건');
    const b = states()[before];
    expect(b).toBeDefined();
    await settle(b, stateOf(3));
    expect(el.textContent).toContain('3건');
  });

  it('QA017 P1: 공용 ReceiptsBoard — A 요청이 끝나기 전에 B로 바뀌면 늦은 A 성공·실패 모두 무시(알림·자료 0)', async () => {
    mount(createElement(ReceiptsBoard, { accountKey: 'uA' }));
    const a = states()[0];
    rerender(createElement(ReceiptsBoard, { accountKey: 'uB' }));
    const b = states().find((p) => p !== a)!;
    await settle(a, new Error('A 실패 알림'), true);
    expect(el.textContent).not.toContain('A 실패 알림');
    await settle(b, stateOf(3));
    expect(el.textContent).toContain('3건');
    expect(el.textContent).not.toContain('A 실패 알림');
  });
});
