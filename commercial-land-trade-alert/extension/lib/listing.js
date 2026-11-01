// 네이버 목록 응답을 매물 1건 모양으로 정리하고 감시 조건으로 거른다. 칸 근거: docs/PREVALIDATION_20261031_NAVER_LISTINGS.md
// 전화·상세 주소·좌표는 꺼내지 않는다. 상호에 섞인 전화번호는 지운다.
import { stripPhoneNumbers } from "./privacy.js";

/** 「3억 9,800」→ 39800, 「12억」→ 120000 (만 원). 못 읽으면 null */
export function parseKoreanPrice(text) {
  if (text === null || text === undefined) return null;
  const s = String(text).replace(/\s+/g, "").replace(/,/g, "");
  if (!s) return null;
  const m = s.match(/^(?:(\d+)억)?(\d+)?$/);
  if (!m || (!m[1] && !m[2])) return null;
  return Number(m[1] || 0) * 10000 + Number(m[2] || 0);
}

export function formatManwon(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  const eok = Math.floor(v / 10000);
  const rest = v % 10000;
  if (!eok) return `${rest.toLocaleString("ko-KR")}만`;
  return rest ? `${eok}억 ${rest.toLocaleString("ko-KR")}만` : `${eok}억`;
}

const TRADE_NAMES = { A1: "매매", B1: "전세", B2: "월세" };
const KIND_NAMES = { SG: "상가", GM: "건물", TJ: "토지" };

/** 유형마다 면적 칸의 뜻이 다르다: 건물 area1 대지·area2 연면적, 상가 area1 공급·area2 전용, 토지 area1 토지 */
function areaOf(kind, raw) {
  const a1 = Number(raw.area1);
  const a2 = Number(raw.area2);
  const pos = (n) => (Number.isFinite(n) && n > 0 ? n : null);
  if (kind === "TJ") return { area: pos(a1), areaLabel: "토지", subArea: null, subLabel: "" };
  if (kind === "GM") return { area: pos(a2), areaLabel: "연면적", subArea: pos(a1), subLabel: "대지" };
  return { area: pos(a2), areaLabel: "전용", subArea: pos(a1), subLabel: "공급" };
}

export function normalizeArticle(raw, targetId, baseUrl) {
  const kind = raw.realEstateTypeCode || "";
  const tradeType = raw.tradeTypeCode || "";
  const price = parseKoreanPrice(raw.dealOrWarrantPrc);
  const rent = parseKoreanPrice(raw.rentPrc);
  const no = String(raw.articleNo ?? "");
  return {
    no,
    targetId: String(targetId),
    kind,
    kindName: raw.realEstateTypeName || KIND_NAMES[kind] || kind,
    tradeType,
    tradeName: raw.tradeTypeName || TRADE_NAMES[tradeType] || tradeType,
    price,
    rent,
    priceText: rent ? `${formatManwon(price)} / 월 ${formatManwon(rent)}` : formatManwon(price),
    ...areaOf(kind, raw),
    jimok: kind === "TJ" ? stripPhoneNumbers(String(raw.articleName || "")).trim() : "", // 토지 이름 칸이 지목(답·전·대·잡종지, 2026-11-01 실측)
    floor: raw.floorInfo || "",
    direction: raw.direction || "",
    feature: stripPhoneNumbers(String(raw.articleFeatureDesc || "")).slice(0, 200),
    confirmYmd: raw.articleConfirmYmd || "",
    realtor: stripPhoneNumbers(raw.realtorName || raw.cpName || ""),
    sameCount: Number(raw.sameAddrCnt) || 1,
    naverChange: raw.priceChangeState || "",
    url: articleUrl(baseUrl, no),
  };
}

export function articleUrl(baseUrl, no) {
  try {
    const u = new URL(baseUrl);
    u.searchParams.set("articleNo", no);
    return u.toString();
  } catch {
    return "";
  }
}

/** 감시 조건(거래 종류·금액·면적). 금액은 매매가 또는 보증금, 만 원 */
export function matchesTarget(item, t) {
  if (Array.isArray(t.trade_types) && t.trade_types.length && !t.trade_types.includes(item.tradeType)) return false;
  if (t.price_min !== null && t.price_min !== undefined && (item.price === null || item.price < Number(t.price_min))) return false;
  if (t.price_max !== null && t.price_max !== undefined && (item.price === null || item.price > Number(t.price_max))) return false;
  if (t.area_min !== null && t.area_min !== undefined && (item.area === null || item.area < Number(t.area_min))) return false;
  if (t.area_max !== null && t.area_max !== undefined && (item.area === null || item.area > Number(t.area_max))) return false;
  return true;
}

/**
 * 네이버 목록 요청에 실린 화면 필터. 저장 주소에 없어도 네이버가 기억한 필터가 실려 온다(2026-11-01 실측).
 * key는 필터가 바뀌었는지 비교하는 값, text는 화면에 보일 글(조건이 없으면 빈 글). 금액 단위는 만 원으로 본다.
 */
export function viewFilter(rawUrl) {
  let p;
  try {
    p = new URL(rawUrl).searchParams;
  } catch {
    return null;
  }
  const num = (k) => {
    const n = Number(p.get(k));
    return Number.isFinite(n) && n > 0 && n < 900000000 ? n : null;
  };
  const range = (name, a, b, fmt) => {
    const lo = num(a);
    const hi = num(b);
    return lo === null && hi === null ? "" : `${name} ${lo === null ? "" : fmt(lo)}~${hi === null ? "" : fmt(hi)}`;
  };
  const parts = [range("가격", "priceMin", "priceMax", formatManwon), range("월세", "rentPriceMin", "rentPriceMax", formatManwon), range("면적", "areaMin", "areaMax", (n) => `${n}㎡`)];
  const trades = (p.get("tradeType") || "").split(":").filter(Boolean).map((c) => TRADE_NAMES[c] || c);
  if (trades.length) parts.push(`거래 ${trades.join("·")}`);
  const text = parts.filter(Boolean).join(" · ");
  return { key: text, text };
}

/**
 * 행정동 필터 사전 검증용 좌표 진단. 회원 PC 안에서만 쓰고 서버로 보내지 않는다.
 * 좌표가 있는 건수, 서로 다른 위치 수, 표본(최대 30건)을 돌려준다.
 */
export function coordStats(articles, maxSample = 30) {
  const withCoord = (articles || []).filter((a) => Number(a?.latitude) && Number(a?.longitude));
  return {
    total: (articles || []).length,
    withCoord: withCoord.length,
    places: new Set(withCoord.map((a) => `${a.latitude},${a.longitude}`)).size,
    sample: withCoord.slice(0, maxSample).map((a) => [String(a.articleNo ?? ""), Number(a.latitude), Number(a.longitude)]),
  };
}

/** 매물 번호 → 좌표. 결과 화면의 행정동 판정용으로 회원 PC에만 둔다 */
export function placesOf(articles) {
  const out = {};
  for (const a of articles || []) if (a?.articleNo && Number(a.latitude) && Number(a.longitude)) out[a.articleNo] = [Number(a.latitude), Number(a.longitude)];
  return out;
}

/** 팝업 「이 화면 감시」: 상가·건물·토지 지도 화면인지 */
export function isWatchableUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== "new.land.naver.com" || !u.pathname.startsWith("/offices")) return false;
    const a = (u.searchParams.get("a") || "").split(":").filter(Boolean);
    return !!u.searchParams.get("ms") && a.length > 0 && a.every((c) => ["SG", "GM", "TJ"].includes(c));
  } catch {
    return false;
  }
}

/**
 * 네이버는 저장 화면으로 옮기기 전에 직전에 본 지역을 먼저 부를 수 있다.
 * 그래서 화면이 자리 잡은 마지막 동 코드를 기준으로 삼고, 다른 동 코드로 받은 쪽은 버린다. 코드가 없는 쪽은 둔다.
 */
export function selectViewPages(pages) {
  const cortarNo = [...pages].reverse().find((p) => p.cortarNo)?.cortarNo || null;
  return { cortarNo, bodies: pages.filter((p) => !p.cortarNo || p.cortarNo === cortarNo).map((p) => p.body) };
}

/** 네이버 지역 목록 응답에서 동 중심 좌표를 고른다 */
export function pickDongCenter(body, cortarNo) {
  const row = (body?.regionList || []).find((r) => String(r.cortarNo) === String(cortarNo));
  const lat = Number(row?.centerLat);
  const lon = Number(row?.centerLon);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat && lon ? { lat, lon } : null;
}

/** 유형·거래별 건수 글. 「상가 매매 76 · 건물 월세 14」 */
export function countByKindTrade(items) {
  const counts = new Map();
  for (const it of items) {
    const k = `${it.kindName} ${it.tradeName}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts].map(([k, n]) => `${k} ${n}`).join(" · ");
}
