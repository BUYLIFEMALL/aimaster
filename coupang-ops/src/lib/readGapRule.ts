// 조회 간격 계산(외부 호출 없음, tests/readGap.test.mjs)

/** 발주서 첫 쪽 조회 간격(초). 「더 보기」(다음 쪽)는 막지 않는다. */
export const ORDER_READ_GAP_SECONDS = 10;

/** 마지막 조회 시각(ISO)과 지금을 비교해 남은 초(올림), 기다릴 필요 없으면 0 */
export function gapLeftSeconds(lastIso: string | undefined, nowMs: number, gapSeconds: number): number {
  if (!lastIso) return 0;
  const last = Date.parse(lastIso);
  if (Number.isNaN(last)) return 0;
  return Math.max(0, Math.ceil((last + gapSeconds * 1000 - nowMs) / 1000));
}
