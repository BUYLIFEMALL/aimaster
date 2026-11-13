// 네이버 쇼핑(스마트스토어 상품소싱기) 검색 화면 읽기 규칙(브라우저·시험 공용).
// 화면 글자가 아니라 페이지에 함께 내려오는 상품 자료(__NEXT_DATA__ compositeList.list)를 읽는다(2026-11-03 실측: 1페이지 56개).
// 「가격비교」로 묶인 상품(판매처 여러 곳)은 구매수가 0으로 오고 리뷰 수만 있다. 판매처가 한 곳인 상품에만 구매수가 있다.

import { cleanImageUrl } from "./photos.js";

const HOST = "https://search.shopping.naver.com";
// 상품명에 흔한 말이라도 상품이 0개인 화면에서만 본다.
const BLOCK_TEXT = /보안 확인|자동입력 방지|비정상적인|접근이 제한|일시적으로 제한|captcha/i;
const NO_RESULT_TEXT = /검색\s?결과가 없습니다/;

/** 네이버 랭킹순(기본) 1페이지. 랭킹순은 판매 실적·인기도가 반영된 순서다. */
export function naverSearchUrl(keyword) {
  return `${HOST}/search/all?query=${encodeURIComponent(keyword)}`;
}

export function isNaverSearchUrl(url) {
  return /^https:\/\/search\.shopping\.naver\.com\/search\/all\?/.test(String(url ?? ""));
}

export function naverQuery(url) {
  try {
    return new URL(url).searchParams.get("query") ?? "";
  } catch {
    return "";
  }
}

/** 네이버 쇼핑 탭 안에서 실행된다. 바깥 변수를 쓸 수 없고, 화면을 움직이지 않는다. 필요한 칸만 돌려준다. */
export function readNaverPage() {
  let list = null;
  try {
    list = JSON.parse(document.getElementById("__NEXT_DATA__")?.textContent ?? "").props?.pageProps?.compositeList?.list ?? null;
  } catch {
    list = null;
  }
  return {
    title: document.title,
    text: (document.body?.innerText ?? "").slice(0, 4000),
    rows: Array.isArray(list)
      ? list.map(({ type, item }) => ({
          id: item?.id ?? null,
          name: item?.productTitle || item?.productName || "",
          price: item?.lowPrice ?? item?.price ?? null,
          reviews: item?.reviewCountSum ?? item?.reviewCount ?? 0,
          purchases: item?.purchaseCnt ?? 0,
          // 「슈퍼적립」 칸은 화면에 「슈퍼적립광고」로 나오는 광고인데 adId가 없다(2026-11-03 실측).
          isAd: Boolean(item?.adId) || type === "supersaving",
          mall: item?.mallName ?? "",
          sellers: item?.mallCount ?? 0,
          url: item?.mallProductUrl ?? "",
          image: item?.imageUrl ?? "",
        }))
      : null,
  };
}

const toCount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};

/** 우리가 열어 줄 상품 주소. 가격비교 상품은 가격비교 화면, 그 밖은 네이버 쇼핑 판매처 주소만 쓴다. */
export function naverProductUrl({ id, sellers, url }) {
  if (sellers > 0) return `${HOST}/catalog/${id}`;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && /(^|\.)naver\.com$/.test(parsed.hostname)) return parsed.href;
  } catch {
    // 아래 가격비교 주소로
  }
  return `${HOST}/catalog/${id}`;
}

export function parseNaverRow(row) {
  const id = /^\d{1,20}$/.test(String(row?.id ?? "")) ? String(row.id) : null;
  const sellers = toCount(row?.sellers);
  const price = Number(row?.price);
  return {
    market: "naver",
    id,
    name: String(row?.name ?? "").trim(),
    price: Number.isFinite(price) && price > 0 ? Math.floor(price) : null,
    reviews: toCount(row?.reviews),
    purchases: toCount(row?.purchases),
    isAd: row?.isAd === true,
    mall: sellers > 0 ? "" : String(row?.mall ?? "").trim(),
    sellers,
    url: id ? naverProductUrl({ id, sellers, url: row?.url }) : "",
    imageUrl: cleanImageUrl(row?.image),
  };
}

/** 읽은 화면이 어떤 상태인지. 상품 자료가 있으면 항상 정상이다. */
export function naverPageState({ rows, title, text }) {
  if (rows?.length) return "ok";
  const all = `${title ?? ""}\n${text ?? ""}`;
  if (BLOCK_TEXT.test(all)) return "blocked";
  if (NO_RESULT_TEXT.test(all)) return "no-result";
  return "unknown";
}
