// ⏳ 오래 안 팔린 매물(2026-10-26, 확장 제안 C-2) — 단지마다 확장이 들고 있는 매물 상태(states)에서
// 지금도 목록에 있는 매물 중 처음 발견한 날로부터 오래된 것을 모은다. 회원 PC 안에서만 계산(서버 미경유).
// 처음 발견한 날 = 이 프로그램이 처음 본 날이다. 첫 수집 때부터 있던 매물은 그 전부터 있었을 수 있어 「N일 이상」으로 표시한다.
import { articleUrl } from "./listing.js";

const DAY = 24 * 60 * 60 * 1000;

/**
 * states: { [complexNo]: { items: { [no]: { priceText, firstSeen, lastSeen, item } }, initializedAt, updatedAt } }
 * names: { [complexNo]: 단지 이름 }
 * → [{ key, complex, dong, tradeName, area, floor, priceText, firstSeen, days, sinceStart, url }] 오래된 순
 */
export function findStale(states, names = {}, { now = Date.now(), minDays = 30, limit = 200 } = {}) {
  const out = [];
  for (const [complexNo, st] of Object.entries(states || {})) {
    if (!st?.items) continue;
    for (const [no, e] of Object.entries(st.items)) {
      if (!e?.firstSeen) continue;
      // 마지막 회차에 보이지 않은 매물(끝까지 못 읽은 회차라 남겨 둔 것)은 지금 있는지 모르니 뺀다
      if (st.updatedAt && e.lastSeen !== st.updatedAt) continue;
      const days = Math.floor((now - new Date(e.firstSeen).getTime()) / DAY);
      if (!(days >= minDays)) continue;
      const it = e.item || {};
      out.push({
        key: `${complexNo}:${no}`,
        complex: names[complexNo] || it.complexName || `단지 ${complexNo}`,
        dong: it.dong || "", tradeName: it.tradeName || "", area: it.area ?? "", floor: it.floor || "",
        priceText: e.priceText || it.priceText || "",
        firstSeen: e.firstSeen, days,
        sinceStart: !!st.initializedAt && e.firstSeen === st.initializedAt,
        url: articleUrl(it.complexNo || complexNo, no),
      });
    }
  }
  return out.sort((a, b) => b.days - a.days || a.complex.localeCompare(b.complex)).slice(0, limit);
}
