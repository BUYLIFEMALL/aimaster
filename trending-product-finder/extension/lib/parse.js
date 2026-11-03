// 쿠팡 검색 화면 글자를 상품 정보로 바꾸고 리뷰 수 기준으로 거르는 순수 함수(브라우저·시험 공용).

const REVIEW_LINE = /^\(([\d,]+)\)$/;
const PRICE_LINE = /^[\d,]+원$/;
// 상품명에 「자외선 차단」처럼 흔한 말은 넣지 않는다. 상품이 0개인 화면에서만 본다.
const BLOCK_TEXT = /Access Denied|보안 문자|자동입력 방지|비정상적인 접근|접근이 제한/;
const NO_RESULT_TEXT = /검색결과가 없습니다/;
// 상품명보다 위에 붙는 혜택·추천 줄(2026-11-03 판매량순 화면 「와우 710원 캐시 적립」)
const BADGE_LINE = /^(와우 [\d,]+원 캐시 적립|쿠팡추천|광고)$/;

export function parseCard({ lines, href, name }) {
  const clean = (lines ?? []).map((line) => String(line).trim()).filter(Boolean);
  const title = String(name ?? "").trim() || clean.find((line) => !BADGE_LINE.test(line)) || "";
  const review = clean.map((line) => line.match(REVIEW_LINE)).find(Boolean);
  // 판매가 = 할인율(「37%」) 바로 다음 금액, 할인이 없으면 첫 금액. 뒤에 붙는 쿠폰 금액(「960원」)은 쓰지 않는다.
  const pctAt = clean.findIndex((line) => /^\d+%$/.test(line));
  const salePrice = pctAt >= 0 && PRICE_LINE.test(clean[pctAt + 1] ?? "") ? clean[pctAt + 1] : clean.find((line) => PRICE_LINE.test(line));
  const id = String(href ?? "").match(/\/vp\/products\/(\d+)/)?.[1] ?? null;
  return {
    id,
    name: title,
    price: salePrice ? Number(salePrice.replace(/[^\d]/g, "")) : null,
    reviews: review ? Number(review[1].replace(/,/g, "")) : 0,
    isAd: clean.includes("광고"),
    url: id ? `https://www.coupang.com/vp/products/${id}` : "",
  };
}

/** 읽은 화면이 어떤 상태인지 판단한다. 상품이 보이면 항상 정상이다. */
export function pageState({ cardCount, title, text }) {
  if (cardCount > 0) return "ok";
  const all = `${title ?? ""}\n${text ?? ""}`;
  if (BLOCK_TEXT.test(all)) return "blocked";
  if (NO_RESULT_TEXT.test(all)) return "no-result";
  return "unknown";
}

/** 같은 마켓의 같은 상품번호는 처음 본 것을 남기고, 리뷰·구매 수는 큰 값을 쓴다. 마켓이 없으면 쿠팡(예전 저장분). */
export function mergeProducts(existing, incoming) {
  const byId = new Map();
  for (const item of [...existing, ...incoming]) {
    if (!item.id) continue;
    const key = `${item.market ?? "coupang"}:${item.id}`;
    const seen = byId.get(key);
    if (!seen) byId.set(key, { ...item });
    else {
      seen.reviews = Math.max(seen.reviews, item.reviews);
      if (item.purchases != null) seen.purchases = Math.max(seen.purchases ?? 0, item.purchases);
      seen.isAd = seen.isAd && item.isAd;
    }
  }
  return [...byId.values()];
}

/** 읽은 순서를 순위로 붙여 지킨다. 판매량순(쿠팡)·랭킹순(네이버) 화면을 읽었다면 이 순위가 그 마켓의 순위다. */
export function filterProducts(items, { minReviews, excludeAds, minPurchases = 0 }) {
  return items
    .map((item, index) => ({ ...item, rank: index + 1 }))
    .filter((item) => item.reviews >= minReviews && (item.purchases ?? 0) >= minPurchases && !(excludeAds && item.isAd));
}

export const MARKET_NAME = { coupang: "쿠팡", naver: "네이버쇼핑" };

/** 판매처 칸: 가격비교 상품은 「가격비교 N곳」, 그 밖은 판매처 이름. */
export function sellerText(item) {
  if (item.market !== "naver") return "";
  return item.sellers > 0 ? `가격비교 ${item.sellers}곳` : item.mall ?? "";
}

/** 엑셀이 수식으로 실행하지 않도록 위험한 첫 글자를 막고 따옴표로 감싼다. */
function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(items) {
  // 확장 목록에는 읽은 순서(판매 순위)가 있고, 사이트 저장분에는 아직 없다.
  const withRank = items.some((item) => item.rank != null);
  // 네이버 쇼핑 상품이 있으면 마켓·구매 수·판매처 칸을 더한다(쿠팡만이면 예전 모양 그대로).
  const withNaver = items.some((item) => item.market === "naver");
  const head = withNaver ? ["마켓", "상품명", "판매가", "리뷰 수", "구매 수", "판매처", "광고", "상품 주소"] : ["상품명", "판매가", "리뷰 수", "광고", "상품 주소"];
  const rows = items.map((item) => {
    const row = withNaver
      ? [MARKET_NAME[item.market ?? "coupang"], item.name, item.price ?? "", item.reviews, item.market === "naver" ? item.purchases ?? 0 : "", sellerText(item), item.isAd ? "광고" : "", item.url]
      : [item.name, item.price ?? "", item.reviews, item.isAd ? "광고" : "", item.url];
    return withRank ? [item.rank ?? "", ...row] : row;
  });
  return "﻿" + [withRank ? ["순위", ...head] : head, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

// 주인님 지정 1년 보관(2026-11-03, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §8)
export const RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

export function isExpired(savedAt, now = Date.now()) {
  return !savedAt || now - savedAt > RETENTION_MS;
}
