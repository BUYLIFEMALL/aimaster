// 시세 대비 변동률과 후보 점수. 회원 PC 안에서만 계산한다.
// 「급매」로 단정하지 않고, 확인할 후보와 근거를 보여 준다.

const SQM_PER_PYEONG = 3.3058;

const MIN_SAMPLES = 5;
const FLOOR_NAME = { b: "지하", 1: "1층", 2: "2층 이상" };

const median = (v) => {
  const s = [...v].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** 매물 층 표기(B1/15, 1/5, 고/15)를 나눈다. 고·중·저처럼 정확한 층을 모르면 null */
export function listingFloor(text) {
  const s = String(text || "").split("/")[0].trim();
  if (/^B/i.test(s) || s.startsWith("지하")) return "b";
  const n = Number(s);
  if (!s || !Number.isInteger(n) || n < 1) return null;
  return n === 1 ? "1" : "2";
}

/**
 * 매매 호가 평당가와, 비슷한 실거래 중간값의 차이(%). 표본 [층, 면적, 평당가, 같은 동 여부].
 * 상가는 같은 층 묶음만, 모든 유형은 면적 0.5~2배만 쓰고 5건이 안 되면 비교하지 않는다(null).
 */
export function marketGap(item, market) {
  // 토지는 지목이 달라 평당가가 수십 배 차이 나서, 지목을 맞출 수 있을 때까지 시세와 비교하지 않는다
  if (item.kind === "TJ") return null;
  const samples = market?.samples?.[item.kind];
  if (!samples || item.tradeType !== "A1" || !item.price || !item.area) return null;
  const floor = item.kind === "SG" ? listingFloor(item.floor) : null;
  if (item.kind === "SG" && !floor) return null;
  const near = samples.filter(([f, a]) => a >= item.area / 2 && a <= item.area * 2 && (item.kind !== "SG" || f === floor));
  const inDong = near.filter((x) => x[3]);
  const used = inDong.length >= MIN_SAMPLES ? inDong : near;
  if (used.length < MIN_SAMPLES) return null;
  const m = median(used.map((x) => x[2]));
  const perPyeong = item.price / (item.area / SQM_PER_PYEONG);
  return { pct: Math.round((perPyeong / m - 1) * 100), scope: used === inDong ? "동" : "시군구", floorName: FLOOR_NAME[floor] || "", count: used.length, median: m };
}

export const gapText = (g) => (g ? `${g.pct > 0 ? "+" : ""}${g.pct}%(${g.scope}${g.floorName ? `·${g.floorName}` : ""} ${g.count}건)` : "");

/**
 * 추정 수익률(%). 같은 화면 월세 매물의 ㎡당 월세·보증금 중간값으로 이 매매 매물의 임대료를 어림한다.
 * 연 임대료 ÷ (매매가 - 보증금). 대출·세금·공실은 뺐고, 비슷한 월세 매물이 5건 미만이면 null. 토지는 계산하지 않는다.
 */
export function estimateYield(item, items) {
  if (item.tradeType !== "A1" || !item.price || !item.area || item.kind === "TJ") return null;
  const floor = item.kind === "SG" ? listingFloor(item.floor) : null;
  if (item.kind === "SG" && !floor) return null;
  const near = items.filter((x) => x.kind === item.kind && x.rent > 0 && x.area >= item.area / 2 && x.area <= item.area * 2 && (item.kind !== "SG" || listingFloor(x.floor) === floor));
  if (near.length < MIN_SAMPLES) return null;
  const rent = median(near.map((x) => x.rent / x.area)) * item.area;
  const deposit = median(near.map((x) => (x.price || 0) / x.area)) * item.area;
  if (item.price <= deposit) return null;
  return { pct: Math.round(((rent * 12) / (item.price - deposit)) * 1000) / 10, count: near.length };
}

const YIELD_DOUBT = 15; // 호가 기준 어림이라 이보다 높으면 값을 지우지 않고 확인 표시만 붙인다
export const yieldText = (y) => (y ? `${y.pct}%(월세 ${y.count}건)${y.pct > YIELD_DOUBT ? " · 확인 필요" : ""}` : "");

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
