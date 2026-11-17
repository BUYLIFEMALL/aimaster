// @vitest-environment jsdom
// WS-20261117-24 E3-2 — 템플릿 자동화 경고를 기존 toast로 한 번(성공 알림 대신 「템플릿은 추가했지만 …」). 세 호출부, ko/en.
// api만 모의(서버·DB 없음). 언어는 기존 방식(localStorage nc:locale)으로 모듈을 새로 불러 정함.
import { afterEach, describe, expect, it, vi } from 'vitest';

// jsdom에는 matchMedia가 없음(기존 DOM 시험과 같은 대체)
if (!window.matchMedia) (window as any).matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
const h = vi.hoisted(() => ({ reply: {} as Record<string, unknown>, calls: [] as string[] }));
vi.mock('../../src/litpage/web/lib/api.ts', async (orig) => ({
  ...(await orig<typeof import('../../src/litpage/web/lib/api.ts')>()),
  api: async (name: string) => {
    h.calls.push(name);
    return { pageId: 'p1', recordMap: {}, ...h.reply };
  },
}));
vi.mock('../../src/litpage/web/lib/router.ts', async (orig) => ({ ...(await orig<typeof import('../../src/litpage/web/lib/router.ts')>()), openPage: () => {} }));

async function load(locale: 'en-US' | 'ko-KR') {
  vi.resetModules();
  localStorage.setItem('nc:locale', locale);
  const api = await import('../../src/litpage/web/features/templates/api.ts');
  const dbt = await import('../../src/litpage/web/features/templates/dbTemplates.tsx');
  const ui = await import('../../src/litpage/web/lib/store/ui.ts');
  const toasts: string[] = [];
  ui.useUI.setState({ toast: (m: string) => void toasts.push(m) } as never);
  return { api, dbt, toasts };
}
const W = ['알림 자동화 「결재 결과 알림(요청자)」를 만들지 못했습니다. ⚡ 자동화에서 직접 추가해 주세요.'];
afterEach(() => {
  h.reply = {};
  h.calls = [];
  localStorage.clear();
});

describe('템플릿 자동화 경고 toast', () => {
  it('경고 문장만 걸러 쓰고, 없으면 null', async () => {
    const { api } = await load('en-US');
    expect(api.templateWarningText(undefined)).toBeNull();
    expect(api.templateWarningText([])).toBeNull();
    expect(api.templateWarningText(['', '  ', 3, null])).toBeNull();
    expect(api.templateWarningText(W)).toContain('결재 결과 알림');
  });

  it.each([
    ['en-US', 'Template added, but:', 'Template added to your workspace'],
    ['ko-KR', '템플릿은 추가했지만:', '템플릿을 워크스페이스에 추가했습니다'],
  ] as const)('「템플릿 추가」(%s): 경고가 있으면 성공 대신 경고 한 번, 없으면 성공 한 번', async (locale, warnHead, okText) => {
    const { api, toasts } = await load(locale);
    h.reply = { automationWarnings: W };
    await api.addTemplate('simple-approval', { open: false });
    expect(toasts).toHaveLength(1);
    expect(toasts[0].startsWith(warnHead)).toBe(true);
    expect(toasts[0]).toContain('결재 결과 알림(요청자)');
    h.reply = {};
    await api.addTemplate('simple-approval', { open: false });
    expect(toasts).toHaveLength(2);
    if (locale === 'en-US') expect(toasts[1]).toBe(okText);
    else expect(toasts[1]).not.toContain('추가했지만');
  });

  it('빈 페이지에 적용(applyTemplate): 경고 있으면 경고 한 번, 없으면 기존 성공 문구', async () => {
    const { api, toasts } = await load('ko-KR');
    h.reply = { automationWarnings: W };
    await api.applyTemplate('simple-approval', 'p1');
    expect(toasts).toEqual([expect.stringMatching(/^템플릿은 추가했지만:/)]);
    h.reply = {};
    await api.applyTemplate('simple-approval', 'p1');
    expect(toasts[1]).toBe('템플릿을 적용했습니다');
  });

  it('빈 표에 적용(applyTemplateToDatabase): 원래 알림이 없던 경로 — 경고 있을 때만 한 번', async () => {
    const { dbt, toasts } = await load('ko-KR');
    await dbt.applyTemplateToDatabase('simple-approval', 'b1');
    expect(toasts).toHaveLength(0);
    h.reply = { automationWarnings: W };
    await dbt.applyTemplateToDatabase('simple-approval', 'b1');
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatch(/^템플릿은 추가했지만:/);
    expect(h.calls).toEqual(['applyTemplateToDatabase', 'applyTemplateToDatabase']);
  });
});
