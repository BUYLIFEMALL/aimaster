// 🔥 급매 표시(2026-10-25, v1.28 — 주인님 「간단한 거니 진행해」 확장 제안 B).
// 이번 회차에 읽은 매매 매물을 같은 단지·같은 전용면적(㎡ 반올림)끼리 묶어, 3건 이상인 묶음의 중간 가격보다
// 10% 이상 싼 매물에 「🔥 -12%」를 붙인다. 회원 PC 안에서만 계산하고 서버로 보내지 않는다.

export const BARGAIN_PCT = -10;
const MIN_GROUP = 3;

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** items(매물 목록) → { [매물 번호]: "🔥 -12%" } — 같은 매물이 여러 중개사로 올라와도 번호마다 판정 */
export function findBargains(items) {
  const groups = new Map();
  for (const it of items || []) {
    if (it?.tradeName !== "매매" || !Number.isFinite(it.price) || it.price <= 0 || !Number.isFinite(Number(it.area))) continue;
    const key = `${it.complexNo}|${Math.round(Number(it.area))}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  const out = {};
  for (const list of groups.values()) {
    if (list.length < MIN_GROUP) continue;
    const mid = median(list.map((it) => it.price));
    for (const it of list) {
      const pct = Math.round((it.price / mid - 1) * 100);
      if (pct <= BARGAIN_PCT) out[it.no] = `🔥 ${pct}%`;
    }
  }
  return out;
}
