// 네이버 목록 응답 → 우리 매물 1건 모양으로 정리하고, 감시 조건으로 거른다.
// 칸 이름은 0단계 사전 검증 결과(PREVALIDATION_20261024.md)와 수집 규칙(/api/extension/collect-rules) 기준.
// 개인 정보(전화·주소·좌표·realtorId)는 꺼내지 않는다. 상호의 전화번호는 지운다.
import { stripPhoneNumbers } from "./privacy.js";

/** 「3억 9,800」→ 39800, 「12억」→ 120000, 「9,800」→ 9800 (만 원). 못 읽으면 null. */
export function parseKoreanPrice(text) {
  if (text === null || text === undefined) return null;
  const s = String(text).replace(/\s+/g, "").replace(/,/g, "");
  if (!s) return null;
  const m = s.match(/^(?:(\d+)억)?(\d+)?$/);
  if (!m || (!m[1] && !m[2])) return null;
  return Number(m[1] || 0) * 10000 + Number(m[2] || 0);
}

/** 39800 → 「3억 9,800」 (만 원) */
export function formatManwon(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  const eok = Math.floor(v / 10000);
  const rest = v % 10000;
  if (!eok) return rest.toLocaleString("ko-KR");
  return rest ? `${eok}억 ${rest.toLocaleString("ko-KR")}` : `${eok}억`;
}

const TRADE_NAMES = { A1: "매매", B1: "전세", B2: "월세" };

/** 목록 응답의 매물 1건 → 정리된 매물(없는 칸은 빈 값). */
export function normalizeArticle(raw, complexNo, complexName, fields = {}) {
  const f = { price: "dealOrWarrantPrc", rent: "rentPrc", ...fields };
  const tradeType = raw.tradeTypeCode || "";
  const price = parseKoreanPrice(raw[f.price]);
  const rent = parseKoreanPrice(raw[f.rent]);
  const area = Number(raw.area2);
  return {
    no: String(raw.articleNo ?? ""),
    complexNo: String(complexNo),
    complexName: complexName || raw.articleName || "",
    dong: raw.buildingName || "",
    tradeType,
    tradeName: raw.tradeTypeName || TRADE_NAMES[tradeType] || tradeType,
    price,
    rent,
    priceText: rent ? `${formatManwon(price)} / ${formatManwon(rent)}` : formatManwon(price),
    area: Number.isFinite(area) && area > 0 ? area : null,
    areaName: raw.areaName || "",
    floor: raw.floorInfo || "",
    direction: raw.direction || "",
    feature: String(raw.articleFeatureDesc || "").slice(0, 200),
    confirmYmd: raw.articleConfirmYmd || "",
    realtor: stripPhoneNumbers(raw.realtorName || raw.cpName || ""),
  };
}

/** 감시 조건(거래 종류·가격·전용면적)에 맞는지. 조건이 비면 통과. 가격은 매매가/보증금 기준. */
export function matchesTarget(item, target) {
  const types = Array.isArray(target.trade_types) && target.trade_types.length ? target.trade_types : ["A1", "B1", "B2"];
  if (item.tradeType && !types.includes(item.tradeType)) return false;
  if (target.price_min != null && (item.price == null || item.price < target.price_min)) return false;
  if (target.price_max != null && (item.price == null || item.price > target.price_max)) return false;
  if (target.area_min != null && (item.area == null || item.area < Number(target.area_min))) return false;
  if (target.area_max != null && (item.area == null || item.area > Number(target.area_max))) return false;
  return true;
}

/** 네이버 매물 주소(엑셀·텔레그램 링크) */
export function articleUrl(complexNo, no) {
  return `https://new.land.naver.com/complexes/${complexNo}?articleNo=${no}`;
}
