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
