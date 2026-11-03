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
  const prices = clean.filter((line) => PRICE_LINE.test(line));
  const id = String(href ?? "").match(/\/vp\/products\/(\d+)/)?.[1] ?? null;
  return {
    id,
    name: title,
    price: prices.length ? Number(prices[prices.length - 1].replace(/[^\d]/g, "")) : null,
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

/** 같은 상품번호는 처음 본 것을 남기고, 리뷰 수는 큰 값을 쓴다. */
export function mergeProducts(existing, incoming) {
  const byId = new Map();
  for (const item of [...existing, ...incoming]) {
    if (!item.id) continue;
    const seen = byId.get(item.id);
    if (!seen) byId.set(item.id, { ...item });
    else {
      seen.reviews = Math.max(seen.reviews, item.reviews);
      seen.isAd = seen.isAd && item.isAd;
    }
  }
  return [...byId.values()];
}

export function filterProducts(items, { minReviews, excludeAds }) {
  return items
    .filter((item) => item.reviews >= minReviews && !(excludeAds && item.isAd))
    .sort((a, b) => b.reviews - a.reviews);
}

/** 엑셀이 수식으로 실행하지 않도록 위험한 첫 글자를 막고 따옴표로 감싼다. */
function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(items) {
  const rows = items.map((item) => [item.name, item.price ?? "", item.reviews, item.isAd ? "광고" : "", item.url]);
  return "﻿" + [["상품명", "판매가", "리뷰 수", "광고", "상품 주소"], ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

// 주인님 지정 1년 보관(2026-11-03, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §8)
export const RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

export function isExpired(savedAt, now = Date.now()) {
  return !savedAt || now - savedAt > RETENTION_MS;
}
