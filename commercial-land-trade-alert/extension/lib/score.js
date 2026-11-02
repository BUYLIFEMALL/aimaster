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
 * 상가는 같은 층 묶음만, 토지는 같은 지목만, 모든 유형은 면적 0.5~2배만 쓰고 5건이 안 되면 비교하지 않는다(null).
 */
export function marketGap(item, market, year = new Date().getFullYear()) {
  // 토지는 지목이 다르면 평당가가 수십 배 차이 나므로, 지목을 모르면 비교하지 않는다
  if (item.kind === "TJ" && !item.jimok) return null;
  const samples = market?.samples?.[item.kind];
  if (!samples || item.tradeType !== "A1" || !item.price || !item.area) return null;
  const floor = item.kind === "SG" ? listingFloor(item.floor) : null;
  if (item.kind === "SG" && !floor) return null;
  const near = samples.filter(([f, a, , , j]) => a >= item.area / 2 && a <= item.area * 2 && (item.kind !== "SG" || f === floor) && (item.kind !== "TJ" || j === item.jimok));
  const inDong = near.filter((x) => x[3]);
  // 연식 구간을 알면 같은 구간 거래를 먼저 쓴다. 신축과 오래된 건물은 평당가가 크게 달라서다(2026-11-02 주인님 의견)
  const byAge = item.age && item.kind !== "TJ" ? (arr) => arr.filter((x) => ageFits(item.age, x[5], year)) : null;
  const dongAge = byAge ? byAge(inDong) : null;
  const nearAge = byAge ? byAge(near) : null;
  let used;
  if (dongAge?.length >= MIN_SAMPLES) used = dongAge;
  else if (inDong.length >= MIN_SAMPLES) used = inDong;
  else if (nearAge?.length >= MIN_SAMPLES) used = nearAge;
  else used = near;
  if (used.length < MIN_SAMPLES) return null;
  const ageMixed = !!byAge && used !== dongAge && used !== nearAge;
  const m = median(used.map((x) => x[2]));
  const perPyeong = item.price / (item.area / SQM_PER_PYEONG);
  // 같은 시군구라도 동마다 값 차이가 커서(2026-11-01 역삼동 상가 +272%, 백석동 토지 -90%) 동 표본이 없으면 참고로만 쓴다. 건물도 같다(2026-11-02 주인님 결정)
  const isDong = used === inDong || used === dongAge;
  const weak = !isDong;
  return { pct: Math.round((perPyeong / m - 1) * 100), scope: isDong ? "동" : "시군구", floorName: item.kind === "TJ" ? item.jimok : FLOOR_NAME[floor] || "", count: used.length, median: m, weak, ageMatched: !!byAge && !ageMixed, ageMixed };
}

/** 매물 연식 구간에 실거래 건축년도가 드는지. 건축년도를 모르는 거래는 넣지 않는다 */
export function ageFits(age, buildYear, year = new Date().getFullYear()) {
  if (!age || !buildYear) return false;
  const a = year - buildYear;
  return age.max != null ? a <= age.max : a >= age.min;
}

export const gapText = (g) => (g ? `${g.pct > 0 ? "+" : ""}${g.pct}%(${g.scope}${g.floorName ? `·${g.floorName}` : ""}${g.ageMatched ? "·같은 연식" : ""} ${g.count}건${g.weak ? "·참고" : ""}${g.ageMixed ? "·연식 섞임" : ""})` : "");

/**
 * 추정 수익률(%). 같은 동 월세 매물의 ㎡당 월세·보증금 중간값으로 이 매매 매물의 임대료를 어림한다.
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

/**
 * 같은 동의 감시 화면을 묶어 수익률을 계산한다. 매매 화면과 월세 화면을 나눠 감시해도 월세를 함께 쓰기 위해서다.
 * rows: [{ item, area }] area는 동 코드(없으면 감시 화면 id). 사라진 매물은 넣지 않는다.
 */
export function applyYields(rows) {
  const pools = new Map();
  for (const r of rows) {
    if (!pools.has(r.area)) pools.set(r.area, new Map());
    pools.get(r.area).set(r.item.no, r.item);
  }
  for (const r of rows) r.item.yieldText = yieldText(estimateYield(r.item, [...pools.get(r.area).values()]));
}

const YIELD_DOUBT = 15; // 호가 기준 어림이라 이보다 높으면 값을 지우지 않고 확인 표시만 붙인다
export const yieldText = (y) => (y ? `${y.pct}%(월세 ${y.count}건)${y.pct > YIELD_DOUBT ? " · 확인 필요" : ""}` : "");

const MIN_PEERS = 3;
const PEER_LOW_PCT = -20;

const totalFloors = (text) => String(text || "").split("/")[1]?.trim() || "";

/**
 * 같은 건물(같은 좌표·같은 총층수)의 상가 매매 호가와 비교한 차이(%). 같은 층 구분·면적 0.5~2배이고 조건이 서로 다른 매물이 3건 이상일 때만.
 * 2026-11-02 측정: 한 건 빼고 맞히기 오차 13~15%로 실거래 비교(31% 이상)보다 작았다. 호가끼리라 실제 거래가는 아니다.
 * 같은 좌표에 총층수가 다른 매물이 섞인 곳이 100곳 중 8곳이라(2026-11-02 실측) 총층수가 없거나 다르면 같은 건물로 보지 않는다.
 */
export function buildingPeerGap(item, items, places) {
  const place = places?.[item.no];
  const floor = listingFloor(item.floor);
  const total = totalFloors(item.floor);
  if (item.kind !== "SG" || item.tradeType !== "A1" || !item.price || !item.area || !place || !floor || !total) return null;
  const sameCondition = (x) => `${x.price}|${x.area}|${x.floor}`;
  const peers = new Map();
  for (const x of items) {
    const p = places[x.no];
    if (x.kind !== "SG" || x.tradeType !== "A1" || !x.price || !x.area || !p || p[0] !== place[0] || p[1] !== place[1] || totalFloors(x.floor) !== total) continue;
    if (listingFloor(x.floor) !== floor || x.area < item.area / 2 || x.area > item.area * 2 || sameCondition(x) === sameCondition(item)) continue;
    peers.set(sameCondition(x), x.price / x.area);
  }
  if (peers.size < MIN_PEERS) return null;
  return { pct: Math.round(((item.price / item.area) / median([...peers.values()]) - 1) * 100), count: peers.size };
}

// 호가·시세보다 많이 싼 매물은 싼 이유(권리관계·임대차·입지)를 꼭 봐야 한다(2026-11-02 주인님·중개사 의견).
// 집합건물(상가)은 대지지분이 작아 전용면적만으로는 값이 낮게 보이고, 건물은 대지면적으로 따져야 매매가에 가깝다.
const CHECK_BASE = "권리관계(등기부등본)·임대차 현황·입지(전면·코너·동선)·현장조사";
const CHECK_BY_KIND = { SG: "집합건물 대지지분", GM: "대지면적 기준 가격" };
export const checkNote = (kind) => `⚠ 확인 필요: ${CHECK_BASE}${CHECK_BY_KIND[kind] ? `·${CHECK_BY_KIND[kind]}` : ""}`;

/** @returns {{score:number, reasons:string[], candidate:boolean}} */
export function scoreListing({ gap, drops = 0, ageDays = 0, peer = null, kind = "" }) {
  let score = 0;
  const reasons = [];
  if (peer && peer.pct <= PEER_LOW_PCT) {
    score += 40;
    reasons.push(`같은 건물 호가 대비 ${peer.pct}%(${peer.count}건)`);
  }
  if (gap && !gap.weak) {
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
  const tooCheap = (peer && peer.pct <= PEER_LOW_PCT) || (gap && !gap.weak && gap.pct <= -20);
  if (tooCheap) reasons.push(checkNote(kind));
  return { score, reasons, candidate: score >= 40 };
}

export const daysSince = (iso, now = Date.now()) => (iso ? Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86400000)) : 0);
