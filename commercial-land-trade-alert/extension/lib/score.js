// 시세 대비 변동률과 후보 점수. 회원 PC 안에서만 계산한다.
// 「급매」로 단정하지 않고, 확인할 후보와 근거를 보여 준다.

const SQM_PER_PYEONG = 3.3058;

/** 매매 호가 평당가와 실거래 중간값의 차이(%). 월세·면적 없음·자료 없음이면 null */
export function marketGap(item, market) {
  const m = market?.[item.kind];
  if (!m?.median || item.tradeType !== "A1" || !item.price || !item.area) return null;
  const perPyeong = item.price / (item.area / SQM_PER_PYEONG);
  return { pct: Math.round((perPyeong / m.median - 1) * 100), scope: m.scope, count: m.count, median: m.median };
}

export const gapText = (g) => (g ? `${g.pct > 0 ? "+" : ""}${g.pct}%(${g.scope} ${g.count}건)` : "");

/** @returns {{score:number, reasons:string[], candidate:boolean}} */
export function scoreListing({ gap, drops = 0, ageDays = 0 }) {
  let score = 0;
  const reasons = [];
  if (gap) {
    const add = gap.pct <= -20 ? 50 : gap.pct <= -10 ? 35 : gap.pct <= -5 ? 15 : 0;
    if (add) {
      score += add;
      reasons.push(`시세보다 ${Math.abs(gap.pct)}% 낮음`);
    }
  }
  if (drops > 0) {
    score += Math.min(30, drops * 15);
    reasons.push(`가격 내림 ${drops}번`);
  }
  if (ageDays >= 30) {
    score += ageDays >= 90 ? 15 : 10;
    reasons.push(`${ageDays}일째 등록`);
  }
  return { score, reasons, candidate: score >= 40 };
}

export const daysSince = (iso, now = Date.now()) => (iso ? Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86400000)) : 0);
