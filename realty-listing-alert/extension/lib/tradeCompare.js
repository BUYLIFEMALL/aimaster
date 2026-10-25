// 실거래가 비교(2026-10-25, v1.19) — 매물 1건(만 원·㎡)을 같은 단지 실거래 면적대 ㎡당 중간값과 비교. 웹 lib/trades.ts compareToTrades와 같은 규칙.
// bands: 서버 /api/extension/trades가 돌려준 [{ area, medianPerM2, count, lastYmd }] — 공공 데이터 요약만, 회원 PC에 하루 기억.

/** 전용면적 ±3㎡ 안의 가장 가까운 면적대와 비교한 %(정수). 비교할 면적대가 없으면 null */
export function compareToTrades(price, area, bands) {
  if (!price || !area || !Array.isArray(bands) || !bands.length) return null;
  const near = bands
    .filter((b) => Math.abs(b.area - area) <= 3)
    .sort((a, b) => Math.abs(a.area - area) - Math.abs(b.area - area))[0];
  if (!near || !near.medianPerM2) return null;
  return { pct: Math.round(((price / area) / near.medianPerM2 - 1) * 100), band: near };
}

/** +8% · −5% · 0% */
export function gapText(pct) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return "";
  return `${pct > 0 ? "+" : ""}${pct}%`;
}
