// 수집 결과 표 → 통계 요약. 기준: realty-listing-alert/extension/lib/stats.js
// 회원 PC(chrome.storage.local)에만 최근 1년 쌓고 서버로 보내지 않는다. 중개사 정보는 넣지 않는다. 금액 단위는 만 원.
import { EVENT_LABEL } from "./compare.js";

const PYEONG = 3.3058;
const STATUS = Object.fromEntries(["new", "priceDown", "priceUp", "gone"].map((k) => [EVENT_LABEL[k], k]));
const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/** 「10억 5,000만」→ 105000 */
function man(text) {
  const m = /^\s*(?:(\d[\d,]*)억)?\s*(?:(\d[\d,]*)만?)?\s*$/.exec(String(text ?? ""));
  if (!m || (!m[1] && !m[2])) return null;
  const n = (s) => Number(String(s || "0").replace(/,/g, ""));
  return n(m[1]) * 10000 + n(m[2]);
}

/** 「15억 / 월 8,500만」→ { price: 150000, rent: 8500 } */
export function parsePriceCell(text) {
  const [a, b] = String(text ?? "").split(" / 월 ");
  return { price: man(a), rent: b === undefined ? null : man(b) };
}

export function summarizeTable(columns, table, at, sggByWatch = {}) {
  const ix = (c) => columns.indexOf(c);
  const C = { watch: ix("감시 화면"), kind: ix("유형"), trade: ix("거래 종류"), price: ix("가격"), status: ix("변동"), area: ix("면적(㎡)"), gap: ix("시세 대비"), yld: ix("추정 수익률") };
  const groups = new Map();
  for (const r of table || []) {
    const key = `${r[C.watch]}|${r[C.kind]}`;
    if (!groups.has(key)) groups.set(key, { watch: String(r[C.watch] ?? ""), kind: String(r[C.kind] ?? ""), total: 0, events: { new: 0, priceDown: 0, priceUp: 0, gone: 0 }, rows: [] });
    const g = groups.get(key);
    const ev = STATUS[r[C.status]];
    if (ev) g.events[ev]++;
    if (ev === "gone") continue; // 사라진 매물은 지금 매물 통계에서 뺀다
    g.total++;
    g.rows.push(r);
  }
  const groupList = [...groups.values()].map((g) => {
    const of = (name) => g.rows.filter((r) => r[C.trade] === name).map((r) => ({ ...parsePriceCell(r[C.price]), area: Number(r[C.area]) || null, gap: Number.parseInt(r[C.gap], 10), yld: Number.parseFloat(r[C.yld]) }));
    const sale = of("매매");
    const rent = of("월세");
    const salePrices = sale.map((x) => x.price).filter(Number.isFinite);
    const gaps = sale.map((x) => x.gap).filter(Number.isFinite);
    const ylds = sale.map((x) => x.yld).filter(Number.isFinite);
    const trades = {};
    if (sale.length) trades["매매"] = { n: sale.length, avg: avg(salePrices), med: median(salePrices), perPyeong: avg(sale.filter((x) => x.price && x.area).map((x) => (x.price / x.area) * PYEONG)), gapAvg: avg(gaps), gapN: gaps.length, yieldAvg: ylds.length ? Math.round((ylds.reduce((a, b) => a + b, 0) / ylds.length) * 10) / 10 : null, yieldN: ylds.length };
    if (rent.length) trades["월세"] = { n: rent.length, avg: avg(rent.map((x) => x.price).filter(Number.isFinite)), rentAvg: avg(rent.map((x) => x.rent).filter(Number.isFinite)) };
    return { name: `${g.watch} · ${g.kind}`, watch: g.watch, kind: g.kind, sgg: sggByWatch[g.watch] || null, total: g.total, events: g.events, trades };
  });
  return { at, groups: groupList };
}

export function pushHistory(history, snap, { now = Date.now(), days = 365, max = 3000 } = {}) {
  const cut = now - days * 24 * 3600 * 1000;
  return [...(history || []).filter((h) => new Date(h.at).getTime() >= cut), snap].slice(-max);
}

/** 변동 매물만 한 줄씩. 중개사 칸은 넣지 않는다 */
export function pickEvents(columns, table, at) {
  const ix = (c) => columns.indexOf(c);
  return (table || []).filter((r) => STATUS[r[ix("변동")]]).map((r) => ({ at, type: STATUS[r[ix("변동")]], watch: r[ix("감시 화면")], kind: r[ix("유형")], price: r[ix("가격")], area: r[ix("면적(㎡)")], floor: r[ix("층")], url: r[ix("네이버 매물 주소")] }));
}

export function pushEvents(log, add, { now = Date.now(), days = 365, max = 20000 } = {}) {
  const cut = now - days * 24 * 3600 * 1000;
  return [...(log || []).filter((e) => new Date(e.at).getTime() >= cut), ...add].slice(-max);
}

/** 최근 7일 처음과 마지막 비교 줄. AI 요약과 주간 리포트가 함께 쓴다 */
export function weekChanges(history, now = Date.now()) {
  const cut = now - 7 * 24 * 3600 * 1000;
  const snaps = (history || []).filter((h) => new Date(h.at).getTime() >= cut);
  const latest = snaps[snaps.length - 1];
  if (!latest) return [];
  return latest.groups.map((g) => {
    const same = snaps.map((s) => s.groups.find((x) => x.name === g.name)).filter(Boolean);
    const first = same[0];
    const sum = (k) => same.reduce((n, x) => n + (x.events[k] || 0), 0);
    return { name: g.name, total: g.total, totalFrom: first.total, avg: g.trades["매매"]?.avg ?? null, avgFrom: first.trades["매매"]?.avg ?? null, new: sum("new"), priceDown: sum("priceDown"), priceUp: sum("priceUp"), gone: sum("gone"), runs: same.length };
  });
}

export function trendText(history, now = Date.now()) {
  return weekChanges(history, now).map((c) => `${c.name}: 수집 ${c.runs}회, 매물 ${c.totalFrom}→${c.total}건, 매매 평균 ${c.avgFrom ?? "-"}→${c.avg ?? "-"}만 원, 새 매물 ${c.new}, 내림 ${c.priceDown}, 오름 ${c.priceUp}, 사라짐 ${c.gone}`).join("\n");
}
