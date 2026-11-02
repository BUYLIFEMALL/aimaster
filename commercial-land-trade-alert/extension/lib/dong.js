// 감시 화면별 「알림 받을 행정동」 거르기(2026-11-02, 플랜 PLAN_20261101_ADMIN_DONG 3단계). 회원 PC 안에서만 판정하고 좌표는 보내지 않는다.
// 판정은 웹 결과 화면(src/lib/adminDongGeo.ts)과 같은 방식이다. 전국 정확도 98.6%(행안부 관할행정동 대조, 2026-11-02).

export const UNKNOWN_DONG = "판정 불가";

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** boundaries: [[행정동, 폴리곤들]] — 한 곳에만 들어가면 그 행정동, 없거나 여러 곳이면 판정 불가 */
export function locateDong(boundaries, lat, lon) {
  const hits = boundaries.filter(([, polys]) => polys.some((p) => inRing(lon, lat, p[0]) && !p.slice(1).some((h) => inRing(lon, lat, h))));
  return hits.length === 1 ? hits[0][0] : UNKNOWN_DONG;
}

/** 저장값 「11680|역삼1동」 목록 → { 시군구: Set(행정동) } */
export function chosenDongs(list) {
  const out = {};
  for (const v of list || []) {
    const [sgg, name] = String(v).split("|");
    if (!/^\d{5}$/.test(sgg) || !name) continue;
    (out[sgg] ||= new Set()).add(name);
  }
  return out;
}

/**
 * 고른 행정동의 알림만 남긴다. placeOf(no) → [위도, 경도] | undefined. boundariesBySgg: { 시군구: 경계 }. 고른 동이 없으면 그대로 돌려준다.
 * 좌표가 없거나 경계를 받지 못해 판정할 수 없으면 놓치지 않게 남기고 「행정동 판정 불가」를 붙인다.
 * 좌표가 있는데 고른 시·군·구 어느 동에도 들지 않으면 뺀다 — 지도 화면이 옆 시·군·구에 걸친 매물이 대부분이라서다(경계 빈틈 0.6%는 함께 빠질 수 있음).
 */
export function filterEventsByDong(events, chosen, boundariesBySgg, placeOf) {
  const sggs = Object.keys(chosen || {});
  if (!sggs.length) return events;
  const loaded = sggs.filter((s) => boundariesBySgg[s]);
  const out = [];
  for (const e of events) {
    const place = placeOf(e.item.no);
    if (!place || !loaded.length) {
      out.push({ ...e, item: { ...e.item, dongText: "행정동 판정 불가" } });
      continue;
    }
    for (const sgg of loaded) {
      const d = locateDong(boundariesBySgg[sgg], place[0], place[1]);
      if (d !== UNKNOWN_DONG && chosen[sgg].has(d)) {
        out.push({ ...e, item: { ...e.item, dongText: d } });
        break;
      }
    }
  }
  return out;
}
