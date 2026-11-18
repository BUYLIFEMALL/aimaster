// 2026-11-18 WS-20261118-06 — 페이지 「전체 너비」의 유효 값 판정(본문···· 메뉴 스위치·단축키가 함께 씀).
// 「📊 업무 현황판」(회원 설정 aww_work_dashboard에 적힌 페이지)은 값이 없으면 기본 전체 너비다.
// 그 밖의 페이지와, 값을 직접 정한 페이지(true/false)는 예전 그대로다. 순수 함수 — 저장소·화면에 의존하지 않는다.

type Fmt = { page_full_width?: boolean | null } | undefined | null;

/** 화면에 적용할 전체 너비 여부. 명시 값이 있으면 그 값, 없으면 현황판은 true, 그 밖은 fallback(예: 표 행 페이지 배치) */
export function effectiveFullWidth(format: Fmt, isWorkDashboard: boolean, fallback = false): boolean {
  const raw = format?.page_full_width;
  if (raw === true || raw === false) return raw;
  return isWorkDashboard ? true : !!fallback;
}

/**
 * 단축키(Ctrl/Cmd+Shift+\)로 뒤집을 때 저장할 값.
 * 현황판: 보이는 상태의 반대를 명시 값으로(기본 넓음 → 첫 토글은 false 저장).
 * 그 밖의 페이지: 예전 동작 그대로 — 켜면 true, 끄면 값 제거(undefined).
 */
export function nextFullWidthByShortcut(format: Fmt, isWorkDashboard: boolean): boolean | undefined {
  if (isWorkDashboard) return !effectiveFullWidth(format, true);
  return !format?.page_full_width || undefined;
}

/** 회원 설정에 적힌 업무 현황판 페이지 id와 같은가(설정·id가 없으면 false) */
export function isWorkDashboardPage(prefs: unknown, pageId: string | undefined | null): boolean {
  const id = (prefs as Record<string, unknown> | null | undefined)?.aww_work_dashboard;
  return typeof id === 'string' && id.length > 0 && id === pageId;
}
