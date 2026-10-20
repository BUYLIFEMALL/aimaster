import type { HistoryItem } from "@/types/influencer";

// v1.21 「🗓 하루 일과 자동 예약」(2026-10-20) — 일과 플래닝으로 만든 장면 컷(작업 히스토리)을 하루 시간표대로 한 번에 인스타 예약.
// 그림은 새로 만들지 않는다(회원 키로 예고 없이 여러 장 과금되지 않게) — 회원이 장면마다 만든 히스토리 컷만 쓴다.
//
// ★ 켜고 끄기 스위치(주인님 지시 2026-10-20: 실제 동작 시험 뒤 「일단 중지」, 나중에 필요하면 켤 수 있게)
//   "off"   = 모두에게 숨김(현재)
//   "admin" = 관리자에게만 보임(운영 시험용)
//   "on"    = 이용 회원 모두에게 보임
//   바꾼 뒤 배포하면 적용된다. 판정은 서버(src/app/page.tsx)에서 한다.
export const ROUTINE_SCHEDULE_MODE: "off" | "admin" | "on" = "off";

/** 장면 순서(1~5)별 기본 게시 시각(한국 시간) — 화면에서 바꿀 수 있다 */
export const ROUTINE_DEFAULT_TIMES = ["08:00", "11:30", "14:00", "18:00", "21:00"];

export function defaultTimeFor(order: number): string {
  return ROUTINE_DEFAULT_TIMES[Math.min(Math.max(order, 1), ROUTINE_DEFAULT_TIMES.length) - 1];
}

/** 가장 최근 일과(planId)의 장면 컷 — 같은 장면 순서는 가장 최근 컷 하나만, 순서대로 */
export function latestRoutineCuts(history: HistoryItem[]): HistoryItem[] {
  const tagged = history.filter((h) => h.config?.routine?.planId && h.imageUrl);
  if (!tagged.length) return [];
  const planId = tagged[0].config.routine!.planId; // history는 최신순
  const byOrder = new Map<number, HistoryItem>();
  for (const h of tagged) {
    if (h.config.routine!.planId !== planId) continue;
    const o = h.config.routine!.order;
    if (!byOrder.has(o)) byOrder.set(o, h);
  }
  return [...byOrder.values()].sort((a, b) => a.config.routine!.order - b.config.routine!.order);
}

/** 내일 날짜(한국 시간) yyyy-mm-dd */
export function tomorrowKst(): string {
  return new Date(Date.now() + 9 * 3600000 + 86400000).toISOString().slice(0, 10);
}
