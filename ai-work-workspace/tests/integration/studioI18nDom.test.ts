// @vitest-environment jsdom
// 2026-11-17 WS-20261117-19 — 영어 화면에서 이번 추가 문구(상단 제목 줄·사이드바 「관제 대시보드」)가 영어, 한국어 화면에서는 기존 한글 그대로.
// 실제 Topbar.RouteTitle·AimasterSidebarBottom을 jsdom에 그림. 언어는 기존 방식(localStorage nc:locale)으로 모듈을 새로 불러 정함. 서버·DB 없음.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const h = vi.hoisted(() => {
  // jsdom에는 matchMedia가 없어 화면 저장소(ui.ts)가 불러올 때 멈춤 — 빈 대체본
  (window as any).matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  return { route: { name: 'studio', domain: 'd' } as Record<string, unknown> };
});
vi.mock('../../src/litpage/web/lib/router.ts', async (orig) => ({
  ...(await orig<typeof import('../../src/litpage/web/lib/router.ts')>()),
  useLocation: () => ({ route: h.route, peek: null, hash: '' }),
  spaceDomain: () => 'd',
  navigate: () => {},
}));
vi.mock('../../src/litpage/web/lib/store/session.ts', async (orig) => ({
  ...(await orig<typeof import('../../src/litpage/web/lib/store/session.ts')>()),
  useSession: (sel: (s: { spaceId: string }) => unknown) => sel({ spaceId: 's1' }),
}));
vi.mock('../../src/litpage/web/lib/hooks.ts', async (orig) => ({ ...(await orig<typeof import('../../src/litpage/web/lib/hooks.ts')>()), useCurrentUser: () => ({ email: 'x@example.com' }) }));

let root: Root | null = null;
let el: HTMLDivElement;
async function load(locale: 'en-US' | 'ko-KR') {
  vi.resetModules();
  localStorage.setItem('nc:locale', locale);
  const top = await import('../../src/litpage/web/features/shell/Topbar.tsx');
  const sb = await import('../../src/litpage/web/features/shell/AimasterSidebar.tsx');
  return { RouteTitle: top.RouteTitle, AimasterSidebarBottom: sb.AimasterSidebarBottom };
}
function render(node: ReturnType<typeof createElement>) { el = document.createElement('div'); document.body.appendChild(el); root = createRoot(el); act(() => root!.render(node)); }
afterEach(() => { act(() => root?.unmount()); root = null; document.body.innerHTML = ''; localStorage.clear(); });

describe('146 이번 추가 문구 ko/en', () => {
  it.each([
    ['en-US', 'studio', 'Control dashboard'],
    ['en-US', 'receipts', 'Receipts & tax invoices'],
    ['ko-KR', 'studio', '관제 대시보드'],
    ['ko-KR', 'receipts', '영수증·세금계산서'],
  ] as const)('%s 상단 제목 줄(%s) = %s (빈 띠 해소)', async (locale, name, text) => {
    const { RouteTitle } = await load(locale);
    h.route = { name, domain: 'd' };
    render(createElement(RouteTitle, { name }));
    expect(el.textContent).toContain(text);
  });

  it('회귀: 다른 경로(tasks·이름 없는 경로)는 기존 동작 그대로', async () => {
    const { RouteTitle } = await load('ko-KR');
    render(createElement(RouteTitle, { name: 'tasks' }));
    expect(el.textContent).toContain('내 작업');
    act(() => root!.unmount()); root = null; document.body.innerHTML = '';
    render(createElement(RouteTitle, { name: 'library' }));
    expect(el.textContent).toBe('');
  });

  it.each([['en-US', 'Control dashboard'], ['ko-KR', '관제 대시보드']] as const)('%s 사이드바 「관제 대시보드」 메뉴 = %s', async (locale, text) => {
    const { AimasterSidebarBottom } = await load(locale);
    render(createElement(AimasterSidebarBottom));
    const labels = [...el.querySelectorAll('.aww-sb-item-label')].map((x) => x.textContent);
    expect(labels[0]).toBe(text);
  });

  // WS-20261117-20: 사이드바 아래 카드의 나머지 일반 라벨·칩·로그아웃도 ko/en(공식 앱 이름·회원 이메일은 번역 안 함)
  it.each([
    ['en-US', ['Control dashboard', 'Work inbox', 'Receipts & tax invoices', 'Calendar sync', 'API keys & platform links', 'Setup & user guide'], ['Collected', 'Evidence', 'Google', 'Links', 'Guide'], 'Log out'],
    ['ko-KR', ['관제 대시보드', '받은 업무', '영수증·세금계산서', '캘린더 연동', 'API키등록·플랫폼연동', '연동 & 사용 매뉴얼'], ['모음', '증빙', '구글', '연동', '가이드'], '로그아웃'],
  ] as const)('%s 사이드바 아래 카드 라벨·칩·로그아웃', async (locale, labels, chips, logout) => {
    const { AimasterSidebarBottom } = await load(locale);
    render(createElement(AimasterSidebarBottom));
    expect([...el.querySelectorAll('.aww-sb-item-label')].map((x) => x.textContent)).toEqual(labels);
    const chipTexts = [...el.querySelectorAll('.aww-sb-item-chip')].map((x) => x.textContent);
    for (const c of chips) expect(chipTexts).toContain(c);
    const out = [...el.querySelectorAll('button')].find((b) => b.getAttribute('title') === logout);
    expect(out?.textContent?.trim()).toBe(logout);
    expect(el.textContent).toContain('x@example.com'); // 회원 이메일은 그대로
  });
});
