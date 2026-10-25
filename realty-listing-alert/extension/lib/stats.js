// 수집 결과 표 → 통계 요약(2026-10-25 주인님 「결과를 가지고 대시보드 형태로 통계 수치나 추이 등 모니터링하고 비교」).
// 회원 PC(chrome.storage.local 「history」)에만 쌓고 서버로 보내지 않는다. 표(sheet.js COLUMNS) 글자에서 계산하므로
// 예전 결과(lastResult.table)로도 첫 요약을 만들 수 있다. 가격 단위는 만 원, ㎡당 가격도 만 원.
import { parseKoreanPrice } from "./listing.js";

export const TRADES = ["매매", "전세", "월세"];
export const AREA_BANDS = [[0, 60, "60㎡ 미만"], [60, 85, "60~85㎡"], [85, 102, "85~102㎡"], [102, Infinity, "102㎡ 이상"]];
const STATUS_KEY = { "🆕 신규": "new", "📉 가격 내림": "priceDown", "📈 가격 오름": "priceUp", "👋 사라짐": "gone" };

const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

function describe(xs) {
  if (!xs.length) return { avg: null, med: null, min: null, max: null };
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return { avg: avg(s), med: s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2), min: s[0], max: s[s.length - 1] };
}

/** 「8억 3,000」→ { price: 83000, rent: null }, 「6,000 / 190」→ { price: 6000, rent: 190 } */
export function parsePriceCell(text) {
  const [a, b] = String(text ?? "").split("/");
  return { price: parseKoreanPrice(a), rent: b === undefined ? null : parseKoreanPrice(b) };
}

/** 표(columns + table) → { at, complexes: [{ name, total, events, trades: { 매매: {...} } }], realtors: [{ name, n }] } */
export function summarizeTable(columns, table, at) {
  const ix = (c) => columns.indexOf(c);
  const C = { name: ix("단지명"), trade: ix("거래 종류"), price: ix("가격(만 원)"), area: ix("전용면적(㎡)"), realtor: ix("중개사 상호"), status: ix("상태") };
  const groups = new Map();
  const realtorCount = new Map();
  for (const r of table || []) {
    const name = String(r[C.name] || "").trim() || "(이름 없음)";
    let g = groups.get(name);
    if (!g) groups.set(name, (g = { name, total: 0, events: { new: 0, priceDown: 0, priceUp: 0, gone: 0 }, rows: [] }));
    const ev = STATUS_KEY[r[C.status]];
    if (ev) g.events[ev]++;
    if (ev === "gone") continue; // 사라진 매물은 지금 매물 통계에서 뺀다
    g.total++;
    g.rows.push(r);
    const realtor = String(r[C.realtor] || "").trim();
    if (realtor) realtorCount.set(realtor, (realtorCount.get(realtor) || 0) + 1);
  }

  const complexes = [...groups.values()].map((g) => {
    const trades = {};
    for (const trade of TRADES) {
      const rows = g.rows.filter((r) => r[C.trade] === trade);
      if (!rows.length) continue;
      const parsed = rows.map((r) => {
        const area = Number(r[C.area]);
        return { ...parsePriceCell(r[C.price]), area: Number.isFinite(area) && area > 0 ? area : null };
      });
      const priced = parsed.filter((p) => Number.isFinite(p.price));
      const t = {
        n: rows.length,
        ...describe(priced.map((p) => p.price)),
        perM2: avg(priced.filter((p) => p.area).map((p) => p.price / p.area)),
        bands: AREA_BANDS.map(([lo, hi, label]) => {
          const ps = priced.filter((p) => p.area !== null && p.area >= lo && p.area < hi).map((p) => p.price);
          return ps.length ? { label, n: ps.length, avg: avg(ps) } : null;
        }).filter(Boolean),
      };
      if (trade === "월세") t.rentAvg = avg(parsed.map((p) => p.rent).filter(Number.isFinite));
      trades[trade] = t;
    }
    return { name: g.name, total: g.total, events: g.events, trades };
  });

  const realtors = [...realtorCount].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, n]) => ({ name, n }));
  return { at, complexes, realtors };
}

/** 기록에 요약 하나를 더하고 오래된 것(기본 90일·최대 400회)을 정리한다. */
export function pushHistory(history, snap, { now = Date.now(), days = 90, max = 400 } = {}) {
  const cut = now - days * 24 * 3600 * 1000;
  return [...(history || []).filter((h) => new Date(h.at).getTime() >= cut), snap].slice(-max);
}

/** 표에서 변동 매물(새 매물·가격 내림·가격 오름·사라짐)만 골라 기록 한 줄씩으로 — 변동 기록(2026-10-25 주인님 「새매물/가격내림/가격변동/삭제 매물 같이 볼 수 있게」) */
export function pickEvents(columns, table, at) {
  const s = columns.indexOf("상태");
  return (table || []).filter((r) => STATUS_KEY[r[s]]).map((row) => ({ at, type: STATUS_KEY[row[s]], row }));
}

/** 변동 기록을 더하고 오래된 것(기본 90일·최대 5000줄)을 정리한다. */
export function pushEvents(log, add, { now = Date.now(), days = 90, max = 5000 } = {}) {
  const cut = now - days * 24 * 3600 * 1000;
  return [...(log || []).filter((e) => new Date(e.at).getTime() >= cut), ...add].slice(-max);
}
