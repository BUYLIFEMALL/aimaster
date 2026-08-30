import "server-only";
import type { NaverAuth } from "./datalab";

// 네이버 검색 API - 쇼핑. 일 25,000회로 데이터랩보다 한도가 넉넉하다.
// 키워드로 등록된 실제 상품 수(=경쟁도 프록시)와 가격대를 조회한다.
// 공식 문서: https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md

const SEARCH_URL = "https://openapi.naver.com/v1/search/shop.json";

export interface ShoppingCompetition {
  keyword: string;
  productCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  sampleItems: Array<{ title: string; lprice: number; link: string; image: string }>;
}

export async function getShoppingCompetition(
  auth: NaverAuth,
  keyword: string,
): Promise<ShoppingCompetition> {
  const url = `${SEARCH_URL}?query=${encodeURIComponent(keyword)}&display=20&sort=sim`;
  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": auth.clientId,
      "X-Naver-Client-Secret": auth.clientSecret,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`네이버 쇼핑검색 API 호출 실패 (${res.status}): ${text || res.statusText}`);
  }

  const data = await res.json();
  const items: Array<{ title: string; lprice: string; link: string; image: string }> = data.items ?? [];
  const prices = items.map((item) => Number(item.lprice)).filter((p) => Number.isFinite(p) && p > 0);

  return {
    keyword,
    productCount: Number(data.total ?? 0),
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    sampleItems: items.slice(0, 5).map((item) => ({
      title: item.title.replace(/<\/?b>/g, ""),
      lprice: Number(item.lprice),
      link: item.link,
      image: item.image,
    })),
  };
}
