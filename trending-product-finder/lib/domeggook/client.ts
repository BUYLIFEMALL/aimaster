import "server-only";

// 도매매(dome.co.kr, 도매꾹과 아이디/API 공유) Open API 클라이언트("server-only" 가드).
// "상품리스트"(mode=getItemList) API — 승인 절차 없이 API Key 발급 즉시 사용 가능한
// Open API 등급. 공식 문서: openapi.domeggook.com "상품조회 > 상품리스트".
// market=supply로 고정해 도매매(위탁소싱, 소량구매 가능) 결과만 받는다 — market=dome은
// 도매꾹(대량 사입 전용)이라 개인 셀러의 소싱 목적과 맞지 않아 의도적으로 제외.
//
// 참고: 실계정으로 아직 검증 전이라 응답 필드명은 공식 문서 기준으로 작성했다.
// 첫 실사용 시 실제 응답과 다르면(특히 item.url, item.deli 등 부가 필드) 조정이 필요할 수 있다.

const BASE_URL = "https://www.domeggook.com/ssl/api/";

export interface DomeggookProduct {
  itemNo: string;
  title: string;
  thumbUrl: string;
  priceKrw: number | null;
  minOrderQty: number | null;
  sellerId: string | null;
  detailUrl: string;
}

interface DomeggookRawItem {
  no?: string | number;
  title?: string;
  price?: string | number;
  thumb?: string;
  url?: string;
  id?: string;
  unitQty?: string | number;
}

/** 키워드로 도매매 소싱 후보 상품을 검색한다. */
export async function searchProducts(
  keyword: string,
  auth: { apiKey: string; pageSize?: number },
): Promise<DomeggookProduct[]> {
  const params = new URLSearchParams({
    ver: "4.1",
    mode: "getItemList",
    aid: auth.apiKey,
    market: "supply",
    om: "json",
    kw: keyword,
    sz: String(auth.pageSize ?? 20),
    pg: "1",
    so: "rd", // 등록일 최신순
  });

  const response = await fetch(`${BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`도매매 API 요청이 실패했습니다. (${response.status}) ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    domeggook?: {
      header?: { errMsg?: string; errCode?: string };
      list?: { item?: DomeggookRawItem | DomeggookRawItem[] };
    };
  };

  const errMsg = data.domeggook?.header?.errMsg;
  if (errMsg) {
    throw new Error(`도매매 API 오류: ${errMsg}`);
  }

  const rawItem = data.domeggook?.list?.item;
  const items: DomeggookRawItem[] = !rawItem ? [] : Array.isArray(rawItem) ? rawItem : [rawItem];

  const parsePrice = (value?: string | number): number | null => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  };

  return items.map((item) => ({
    itemNo: String(item.no ?? ""),
    title: item.title ?? "",
    thumbUrl: item.thumb ?? "",
    priceKrw: parsePrice(item.price),
    minOrderQty: parsePrice(item.unitQty),
    sellerId: item.id ?? null,
    detailUrl: item.url || (item.no ? `https://domeggook.com/${item.no}` : ""),
  }));
}
