// A2(2026-11-02, 플랜 docs/PLAN_20261102_A2_A3.md): 보유 자료 기준 최고가·최저가, 지역 거래량 증가. 순수 함수만 둔다(시험 대상).

export type PriceRank = "high" | "low";

export const RANK_MIN_PEERS = 3; // 비교할 거래가 이보다 적으면 표시하지 않는다
export const RANK_AREA_TOLERANCE = 3; // 같은 평형으로 보는 전용면적 차이(㎡)
export const RANK_MONTHS = 12;

/** 같은 단지·비슷한 면적 거래 금액들과 비교. 모두보다 높으면 high, 모두보다 낮으면 low. 표본이 모자라면 null */
export function priceRank(price: number | null, peers: number[]): PriceRank | null {
  const list = peers.filter((p) => Number.isFinite(p) && p > 0);
  if (!price || list.length < RANK_MIN_PEERS) return null;
  if (price > Math.max(...list)) return "high";
  if (price < Math.min(...list)) return "low";
  return null;
}

/** 「신고가」라고 쓰지 않는다 — 우리가 모은 자료(회당 20건 상한·보관 1년) 기준이다 */
export function rankLabel(rank: string | null | undefined): string | null {
  if (rank === "high") return "📈 보유 자료 12개월 최고가";
  if (rank === "low") return "📉 보유 자료 12개월 최저가";
  return null;
}

/** 한국 시간 기준 「yyyymm」 — 이번 달부터 거꾸로 count개 */
export function recentMonths(now: Date, count: number): string[] {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - i, 1));
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export const VOLUME_MONTHS = 5; // 이번 달 + 지난달 + 비교용 3개월
export const VOLUME_RISE = 1.3;
export const VOLUME_MIN = 10;

export type VolumeTrend = { ym: string; last: number; avg: number; rising: boolean };

/**
 * 달별 매매 건수(세 유형 합) → 지난달이 직전 3개월 평균보다 30% 이상 많고 10건 이상이면 증가.
 * 이번 달은 신고 기한(계약 후 30일)이 남아 비교하지 않는다. 비교할 달이 다 없으면 null
 */
export function volumeTrend(byMonth: Record<string, number>, now: Date): VolumeTrend | null {
  const [, last, ...prev] = recentMonths(now, VOLUME_MONTHS);
  if (!(last in byMonth) || prev.some((m) => !(m in byMonth))) return null;
  const avg = prev.reduce((s, m) => s + byMonth[m], 0) / prev.length;
  const n = byMonth[last];
  return { ym: last, last: n, avg: Math.round(avg), rising: n >= VOLUME_MIN && n >= avg * VOLUME_RISE };
}

/** 다시 받아야 할 달: 이번 달·지난달은 하루가 지나면, 그 전 달은 저장된 적이 없을 때만 */
export function volumeMonthsToFetch(stored: Record<string, string>, now: Date, staleMs = 20 * 3600 * 1000): string[] {
  const months = recentMonths(now, VOLUME_MONTHS);
  return months.filter((m, i) => {
    const at = stored[m];
    if (!at) return true;
    return i < 2 && now.getTime() - new Date(at).getTime() > staleMs;
  });
}

export const ymLabel = (ym: string) => `${Number(ym.slice(4))}월`;
