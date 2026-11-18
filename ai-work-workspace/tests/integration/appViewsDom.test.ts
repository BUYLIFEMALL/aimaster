// @vitest-environment jsdom
// 2026-11-18 WS-20261118-04 — 워크스페이스 안 앱 화면(받은 업무·캘린더 연동·API키등록·매뉴얼)을 실제 React로 jsdom에 그려 확인.
// 기존 화면 컴포넌트(InboxBoard·CalendarBoard·KeysForm·GuideBody)를 그대로 쓰는지, 로그아웃·계정 바뀜 때 자료를 그리지 않고 새로 만드는지.
// rpc·세션만 모의(서버·DB·실제 구글 없음). jsdom은 배치·스크롤을 계산하지 않음 — 시각 판정 아님.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const h = vi.hoisted(() => ({
  calls: [] as { name: string; account?: string | null }[],
  session: { userId: 'uA' as string | null },
}));
vi.mock('../../src/lib/standaloneRpc.ts', async (orig) => ({
  ...(await orig<typeof import('../../src/lib/standaloneRpc.ts')>()),
  rpc: (name: string, _body?: unknown, opts?: { expectedAccount?: string | null }) => {
    h.calls.push({ name, account: opts?.expectedAccount });
    return new Promise(() => {}); // 응답 없음: 첫 「불러오는 중」 상태만 본다
  },
}));
// 키 화면은 /api/keys를 fetch로 직접 읽는다 — 실제 네트워크 0, 부른 주소만 기록
vi.stubGlobal('fetch', (url: unknown) => {
  h.calls.push({ name: `fetch:${String(url)}` });
  return new Promise(() => {});
});
vi.mock('../../src/litpage/web/lib/store/session.ts', () => ({ useSession: (sel: (s: typeof h.session) => unknown) => sel(h.session) }));

const { InboxView, CalendarSyncView, KeysView, GuideView, gmailOnFromDom } = await import('../../src/litpage/web/features/appviews/AppViews.tsx');

let root: Root | null = null;
let el: HTMLDivElement;
function mount(node: ReturnType<typeof createElement>) {
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
  act(() => root!.render(node));
}
const rerender = (node: ReturnType<typeof createElement>) => act(() => root!.render(node));
afterEach(() => { act(() => root?.unmount()); root = null; document.body.innerHTML = ''; h.calls = []; h.session.userId = 'uA'; });

const VIEWS = [
  ['inbox', InboxView, '받은 업무'],
  ['calendar-sync', CalendarSyncView, '캘린더 연동'],
  ['keys', KeysView, 'API키등록·플랫폼연동'],
] as const;

describe('워크스페이스 안 앱 화면', () => {
  it.each(VIEWS)('%s: 본문 틀·제목을 그리고 「돌아가기」 링크 없이 기존 화면이 회원 rpc를 부른다', (view, View, title) => {
    mount(createElement(View));
    const frame = el.querySelector('.aww-guide.aww-app-view');
    expect(frame?.getAttribute('data-app-view')).toBe(view);
    expect(el.querySelector('h1')?.textContent).toBe(title);
    expect(el.querySelector('.aww-guide-back')).toBeNull();
    expect(h.calls.length).toBeGreaterThan(0);
  });

  it.each(VIEWS)('%s: 로그아웃(회원 id 없음)이면 자료 화면을 그리지 않고 rpc 0', (_view, View) => {
    h.session.userId = null;
    mount(createElement(View));
    expect(el.querySelector('h1')).not.toBeNull();
    expect(h.calls.length).toBe(0);
  });

  it.each(VIEWS)('%s: 계정 A→B면 화면을 새로 만들어 다시 불러온다', (_view, View) => {
    mount(createElement(View));
    const before = h.calls.length;
    h.session.userId = 'uB';
    rerender(createElement(View));
    expect(h.calls.length).toBeGreaterThan(before);
  });

  it('keys: 안내문(본인 키·키 보안)을 별도 페이지와 같은 문구로 보여 준다', () => {
    mount(createElement(KeysView));
    expect(el.querySelector('.aww-tip')?.textContent).toContain('회원 본인의 Claude·OpenAI·Gemini API 키 중 하나');
    expect(el.querySelector('.aww-warn')?.textContent).toContain('키는 다른 사람에게 보여 주지 마세요');
  });

  it('guide: 매뉴얼 본문(제목·단계·자주 묻는 질문)을 그리고 rpc는 부르지 않는다', () => {
    mount(createElement(GuideView));
    expect(el.querySelector('[data-app-view="guide"]')).not.toBeNull();
    expect(el.querySelector('h1')?.textContent).toBe('AI 업무 워크스페이스 3분 마스터 가이드');
    expect(el.querySelector('.aww-guide-back')).toBeNull();
    expect(el.textContent).toContain('스마트 워크스페이스 생성');
    expect(h.calls.length).toBe(0);
  });

  it('Gmail 스위치는 서버가 #lit-app에 실어 준 값만 읽는다(없으면 꺼짐)', () => {
    expect(gmailOnFromDom()).toBe(false);
    const app = document.createElement('div');
    app.id = 'lit-app';
    document.body.appendChild(app);
    expect(gmailOnFromDom()).toBe(false);
    app.dataset.gmailOn = '0';
    expect(gmailOnFromDom()).toBe(false);
    app.dataset.gmailOn = '1';
    expect(gmailOnFromDom()).toBe(true);
  });
});
