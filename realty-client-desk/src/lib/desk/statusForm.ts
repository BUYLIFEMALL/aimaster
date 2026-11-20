// 2026-11-20(Mac 독립 검수 msg_e76ff8708dd4 반영): 매물 상태 폼의 선택값 규칙 — 순수 함수(시험에서 그대로 실행).
// 폼은 매물 ID로만 구분해(상태가 바뀌어도 다시 만들지 않음) 성공·오류 문구가 남게 하고, 선택값은 이 규칙으로 맞춘다.

/**
 * 서버 응답 뒤 선택 상자에 보일 값.
 * - 오류(또는 응답 불명): 실제 저장된 상태(current)로 되돌린다 — 바뀌지 않은 값을 바뀐 것처럼 보이지 않게.
 * - 성공: 회원이 고른 값(chosen) 그대로(곧 서버가 새로 그린 current와 같아짐).
 */
export function selectedAfter(result: { error?: string; success?: string }, current: string, chosen: string): string {
  if (result.error) return current;
  if (result.success) return chosen;
  return chosen;
}

/** 목록이 새로 그려져 실제 상태(current)가 바뀌면 선택값도 그 값으로 맞춘다. 같으면 회원 선택 유지 */
export function syncSelected(prevCurrent: string, nextCurrent: string, selected: string): string {
  return prevCurrent === nextCurrent ? selected : nextCurrent;
}

/**
 * setSelected에 넘길 updater. 이전·새 상태를 **만드는 순간에 붙잡아** 둔다 — React가 updater를 나중에 실행해도
 * (그사이 ref가 새 값으로 바뀌어도) 붙잡은 값으로 판단한다(Mac 재검수 msg_6f15eb6e4df2).
 */
export function makeSyncUpdater(prevCurrent: string, nextCurrent: string): (selected: string) => string {
  return (selected) => syncSelected(prevCurrent, nextCurrent, selected);
}
