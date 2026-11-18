// @vitest-environment jsdom
// 2026-11-18 WS-20261118-06 — 업무 현황판 전체 너비: 본문···· 메뉴 스위치·단축키가 같은 유효 값을 쓰는지.
// 세 상태(값 없음·true·false) × 현황판/일반 페이지. 실제 pageSetting·togglePageSetting(PageMenu)을 저장 함수만 모의해 확인(실제 설정 쓰기 0).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectiveFullWidth, isWorkDashboardPage, nextFullWidthByShortcut } from '../../src/litpage/web/features/page/pageWidth.ts';

// PageMenu가 불러오는 화면 모듈들이 처음 불릴 때 쓰는 브라우저 기능(jsdom에 없음)만 채움
vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }));

const h = vi.hoisted(() => ({
  prefs: { aww_work_dashboard: 'dash' } as Record<string, unknown>,
  blocks: {} as Record<string, { id: string; format?: Record<string, unknown> }>,
  writes: [] as { id: string; patch: Record<string, unknown> }[],
}));
vi.mock('../../src/litpage/web/features/settings/userSettings.ts', () => ({ getUserPrefs: () => h.prefs }));
vi.mock('../../src/litpage/web/lib/blocks.ts', async (orig) => ({
  ...(await orig<Record<string, unknown>>().catch(() => ({}))),
  getBlock: (id: string) => h.blocks[id],
  run: (_name: string, fn: (tx: unknown) => void) => fn({}),
  setFormat: (_tx: unknown, id: string, patch: Record<string, unknown>) => { h.writes.push({ id, patch }); },
}));

describe('유효 전체 너비(순수 판정)', () => {
  it('현황판: 값 없음=넓게, true=넓게, false=좁게(직접 끈 값 유지)', () => {
    expect(effectiveFullWidth(undefined, true)).toBe(true);
    expect(effectiveFullWidth({}, true)).toBe(true);
    expect(effectiveFullWidth({ page_full_width: null }, true)).toBe(true);
    expect(effectiveFullWidth({ page_full_width: true }, true)).toBe(true);
    expect(effectiveFullWidth({ page_full_width: false }, true)).toBe(false);
  });
  it('일반 페이지: 값 없음=좁게(표 행 배치 기본값이 있으면 그 값), 명시 값 우선', () => {
    expect(effectiveFullWidth({}, false)).toBe(false);
    expect(effectiveFullWidth({}, false, true)).toBe(true);
    expect(effectiveFullWidth({ page_full_width: false }, false, true)).toBe(false);
    expect(effectiveFullWidth({ page_full_width: true }, false)).toBe(true);
  });
  it('현황판 여부: 설정의 id와 같을 때만', () => {
    expect(isWorkDashboardPage({ aww_work_dashboard: 'dash' }, 'dash')).toBe(true);
    expect(isWorkDashboardPage({ aww_work_dashboard: 'dash' }, 'other')).toBe(false);
    expect(isWorkDashboardPage({}, 'dash')).toBe(false);
    expect(isWorkDashboardPage(null, 'dash')).toBe(false);
    expect(isWorkDashboardPage({ aww_work_dashboard: '' }, '')).toBe(false);
    expect(isWorkDashboardPage({ aww_work_dashboard: 'dash' }, undefined)).toBe(false);
  });
  it('단축키: 현황판 첫 토글은 명시 false, 다시 누르면 true / 일반 페이지는 예전 그대로(true ↔ 값 제거)', () => {
    expect(nextFullWidthByShortcut({}, true)).toBe(false);
    expect(nextFullWidthByShortcut({ page_full_width: false }, true)).toBe(true);
    expect(nextFullWidthByShortcut({ page_full_width: true }, true)).toBe(false);
    expect(nextFullWidthByShortcut({}, false)).toBe(true);
    expect(nextFullWidthByShortcut({ page_full_width: true }, false)).toBeUndefined();
    expect(nextFullWidthByShortcut({ page_full_width: false }, false)).toBe(true);
  });
});

describe('··· 메뉴(실제 pageSetting·togglePageSetting)', async () => {
  const { pageSetting, togglePageSetting } = await import('../../src/litpage/web/features/page/PageMenu.tsx');
  beforeEach(() => { h.writes = []; h.blocks = {}; h.prefs = { aww_work_dashboard: 'dash' }; });
  const block = (id: string, format?: Record<string, unknown>) => (h.blocks[id] = { id, format });

  it('현황판 값 없음: 스위치 켜짐으로 보이고, 첫 토글이 명시 false를 저장', () => {
    const b = block('dash');
    expect(pageSetting(b as never, 'page_full_width')).toBe(true);
    togglePageSetting('dash', 'page_full_width');
    expect(h.writes).toEqual([{ id: 'dash', patch: { page_full_width: false } }]);
  });
  it('현황판 false: 꺼짐으로 보이고 토글하면 true / true: 켜짐으로 보이고 토글하면 false', () => {
    expect(pageSetting(block('dash', { page_full_width: false }) as never, 'page_full_width')).toBe(false);
    togglePageSetting('dash', 'page_full_width');
    expect(pageSetting(block('dash', { page_full_width: true }) as never, 'page_full_width')).toBe(true);
    togglePageSetting('dash', 'page_full_width');
    expect(h.writes.map((w) => w.patch.page_full_width)).toEqual([true, false]);
  });
  it('일반 페이지 회귀: 값 없음=꺼짐·토글 true, true=켜짐·토글 false', () => {
    expect(pageSetting(block('p1') as never, 'page_full_width')).toBe(false);
    togglePageSetting('p1', 'page_full_width');
    expect(pageSetting(block('p1', { page_full_width: true }) as never, 'page_full_width')).toBe(true);
    togglePageSetting('p1', 'page_full_width');
    expect(h.writes.map((w) => w.patch.page_full_width)).toEqual([true, false]);
  });
  it('다른 설정 회귀: 작은 글씨는 현황판이어도 값 그대로', () => {
    expect(pageSetting(block('dash') as never, 'page_small_text')).toBe(false);
    expect(pageSetting(block('dash', { page_small_text: true }) as never, 'page_small_text')).toBe(true);
  });
  it('옆 미리보기(peek) 메뉴: 본문이 현황판 기본값을 쓰지 않으므로 값 없음=꺼짐·첫 토글 true, 명시 값은 그대로', () => {
    expect(pageSetting(block('dash') as never, 'page_full_width', { peek: true })).toBe(false);
    togglePageSetting('dash', 'page_full_width', { peek: true });
    expect(pageSetting(block('dash', { page_full_width: true }) as never, 'page_full_width', { peek: true })).toBe(true);
    expect(pageSetting(block('dash', { page_full_width: false }) as never, 'page_full_width', { peek: true })).toBe(false);
    togglePageSetting('dash', 'page_full_width', { peek: true });
    expect(h.writes.map((w) => w.patch.page_full_width)).toEqual([true, true]);
    // 본문(PageView)이 peek에서 쓰는 판정과 같은 값: 현황판 아님으로 계산
    expect(effectiveFullWidth({}, false)).toBe(false);
  });
  it('현황판 설정이 없으면(다른 회원 등) 값 없는 페이지는 꺼짐', () => {
    h.prefs = {};
    expect(pageSetting(block('dash') as never, 'page_full_width')).toBe(false);
  });
});
