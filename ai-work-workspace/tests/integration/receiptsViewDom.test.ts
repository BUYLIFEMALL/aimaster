// @vitest-environment jsdom
// 2026-11-17 WS-20261117-17 — 워크스페이스 안 영수증 화면(ReceiptsView)·공용 ReceiptsBoard를 실제 React로 jsdom에 그려 확인.
// QA017 P1(Mac msg_7ba69f851b09): 계정 A→B·로그아웃 때 A 자료 즉시 숨김, 늦게 온 A 응답(성공·실패)·화면 해제 뒤 응답은 상태 변경 0,
// StrictMode 두 번 실행에서도 마지막 요청만 반영. rpc·세션만 모의(서버·DB 없음). jsdom은 배치·색을 계산하지 않음 — 시각 판정 아님.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, StrictMode, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const h = vi.hoisted(() => ({
  pending: [] as { name: string; opts?: { expectedAccount?: string | null }; resolve: (v: unknown) => void; reject: (e: unknown) => void }[],
  session: { userId: 'uA' as string | null },
}));
vi.mock('../../src/lib/standaloneRpc.ts', async (orig) => ({
  ...(await orig<typeof import('../../src/lib/standaloneRpc.ts')>()),
  rpc: (name: string, _body?: unknown, opts?: { expectedAccount?: string | null }) => new Promise((resolve, reject) => h.pending.push({ name, opts, resolve, reject })),
}));
vi.mock('../../src/litpage/web/lib/store/session.ts', () => ({ useSession: (sel: (s: typeof h.session) => unknown) => sel(h.session) }));

const { ReceiptsView } = await import('../../src/litpage/web/features/receipts/ReceiptsView.tsx');
const { ReceiptsBoard } = await import('../../src/app/receipts/ReceiptsBoard.tsx');
const { AccountChangedError } = await import('../../src/lib/standaloneRpc.ts');
const { BoltaPanel } = await import('../../src/app/receipts/BoltaPanel.tsx');
const { ReceiptRpcContext, boundReceiptRpc } = await import('../../src/app/receipts/receiptRpc.ts');

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
afterEach(() => { act(() => root?.unmount()); root = null; document.body.innerHTML = ''; h.pending = []; h.session.userId = 'uA'; sessionStorage.clear(); });

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

  it('Master msg_72c6254fc339: 보드의 모든 요청에 화면 기대 계정(accountKey)을 실어 보냄', () => {
    mount(createElement(ReceiptsBoard, { accountKey: 'uA' }));
    expect(h.pending.length).toBeGreaterThan(0);
    expect(h.pending.every((p) => p.opts?.expectedAccount === 'uA')).toBe(true);
  });

  it('서버가 409(계정 바뀜)를 주면 보이던 A 자료·쓰기 화면을 즉시 숨기고 새로고침 안내만, B 자료로 자동 전환 0', async () => {
    mount(createElement(ReceiptsBoard, { accountKey: 'uA' }));
    await settle(states()[0], stateOf(7));
    expect(el.textContent).toContain('7건');
    // 이후 다시 불러오기(예: 다른 탭에서 B로 바꾼 뒤 저장·월 변경)가 409
    await act(async () => { (el.querySelector('.rc-x') as HTMLElement | null)?.click(); });
    const again = h.pending.length;
    // 탭 전환 등으로 생긴 다음 요청이 없으면 직접 409를 일으키는 첫 요청을 기다림 — 보드 load를 다시 부르는 기존 버튼이 없으므로 월 입력 변경으로
    const month = el.querySelector('input[type="month"]') as HTMLInputElement | null;
    expect(month).not.toBeNull();
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      set.call(month, '2026-10');
      month!.dispatchEvent(new Event('input', { bubbles: true }));
      month!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const next = h.pending.slice(again).find((p) => p.name === 'rcptState');
    expect(next).toBeDefined();
    await settle(next!, new AccountChangedError(), true);
    expect(el.textContent).not.toContain('7건');
    expect(el.querySelector('.rc-tabs')).toBeNull();
    expect(el.textContent).toContain('새로고침');
  });

  it('볼타 설정 화면 요청도 같은 기대 계정으로(컨텍스트 전달, 전역 변수 0)', () => {
    const bound = boundReceiptRpc('uA', () => {});
    mount(createElement(ReceiptRpcContext.Provider, { value: bound }, createElement(BoltaPanel, { notify: () => {} })));
    const toggle = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('볼타로 바로 발급'))!;
    act(() => toggle.click()); // 펼쳤을 때만 btStatus를 부름
    const bt = h.pending.filter((p) => p.name.startsWith('bt'));
    expect(bt.length).toBeGreaterThan(0);
    expect(bt.every((p) => p.opts?.expectedAccount === 'uA')).toBe(true);
  });

  it('보드·볼타·수정발행 파일은 기대 계정 없는 rpc를 직접 쓰지 않음(모든 rcpt/bt 요청이 컨텍스트 경유)', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    // jsdom 환경에서는 import.meta.url이 /@fs 주소라 실행 폴더(ai-work-workspace 또는 저장소 루트) 기준으로 찾음
    const dir = [resolve(process.cwd(), 'src/app/receipts'), resolve(process.cwd(), 'ai-work-workspace/src/app/receipts')].find((d) => existsSync(d))!;
    for (const f of ['ReceiptsBoard.tsx', 'BoltaPanel.tsx', 'AmendPanel.tsx']) {
      const src = readFileSync(resolve(dir, f), 'utf8');
      expect(src, f).not.toMatch(/import\s*\{[^}]*\brpc\b[^}]*\}\s*from\s*["']@\/lib\/standaloneRpc["']/);
    }
  });

  // Mac msg_eaf07a78757d/3d7c709d1eac: 받은 업무 세금계산서 초안(sessionStorage aww:rcptDraft)도 계정 수명에 묶음
  const BIZ = { bizNo: '', name: '', ceo: '', address: '', bizType: '', bizItem: '', email: '', phone: '' };
  const fieldValues = () => [...el.querySelectorAll('input, textarea')].map((x) => (x as HTMLInputElement).value);
  const putDraft = (extra: Record<string, unknown>) => sessionStorage.setItem('aww:rcptDraft', JSON.stringify({ partner: { ...BIZ, name: 'A거래처' }, memo: 'A메모', from: '메일', ...extra }));

  it('A가 만든 초안: A 화면 발행 탭에 채움 → B로 바뀌면 실제 입력칸에 A 값 0, 탭 초기화, 이후 요청은 기대 계정 B만', async () => {
    putDraft({ account: 'uA' });
    mount(createElement(ReceiptsBoard, { accountKey: 'uA' }));
    await settle(states()[0], stateOf(0));
    expect(fieldValues()).toContain('A거래처');
    expect(sessionStorage.getItem('aww:rcptDraft')).toBeNull(); // 같은 계정이 한 번 쓰고 지움(기존 동작)
    const before = h.pending.length;
    rerender(createElement(ReceiptsBoard, { accountKey: 'uB' }));
    expect(fieldValues().some((v) => v.includes('A거래처') || v.includes('A메모'))).toBe(false);
    const b = h.pending.slice(before).find((p) => p.name === 'rcptState')!;
    await settle(b, stateOf(0));
    expect(el.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain('증빙 정리');
    const issue = [...el.querySelectorAll('[role="tab"]')].find((t) => t.textContent?.includes('발행')) as HTMLElement;
    act(() => issue.click());
    expect(fieldValues().some((v) => v.includes('A거래처') || v.includes('A메모'))).toBe(false);
    expect(h.pending.slice(before).every((p) => p.opts?.expectedAccount === 'uB')).toBe(true);
  });

  it('다른 계정(A)이 만든 초안은 B 화면에서 쓰지 않고 지우지도 않음', async () => {
    putDraft({ account: 'uA' });
    mount(createElement(ReceiptsBoard, { accountKey: 'uB' }));
    await settle(states()[0], stateOf(0));
    expect(fieldValues().some((v) => v.includes('A거래처'))).toBe(false);
    expect(sessionStorage.getItem('aww:rcptDraft')).not.toBeNull();
  });

  it('작성 계정이 없는 이전 형식 초안은 자동 사용 중단(채우지 않음, 자료 그대로)', async () => {
    putDraft({});
    mount(createElement(ReceiptsBoard, { accountKey: 'uA' }));
    await settle(states()[0], stateOf(0));
    expect(fieldValues().some((v) => v.includes('A거래처'))).toBe(false);
    expect(sessionStorage.getItem('aww:rcptDraft')).not.toBeNull();
  });

  it('StrictMode(효과 두 번)에서도 같은 계정 초안을 잃지 않고 채움', async () => {
    putDraft({ account: 'uA' });
    mount(createElement(StrictMode, null, createElement(ReceiptsBoard, { accountKey: 'uA' })));
    const all = states();
    await settle(all[all.length - 1], stateOf(0));
    expect(fieldValues()).toContain('A거래처');
  });
});
