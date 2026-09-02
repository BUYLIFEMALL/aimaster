import "server-only";

// 11번가 Open API 클라이언트("server-only" 가드) — "상품검색"(apiCode=ProductSearch) API.
// 셀러 등록 없이 "서비스 등록"(개인 회원가입만으로 가능, 사업자등록 불필요)만으로 발급되는
// 일반 Open API 등급이다 — 셀러 API(상품등록/주문관리 등)와는 별개로, 검색/카테고리 조회만
// 가능한 낮은 권한이라 소싱 후보 검색 용도에 딱 맞는다. 공식 문서: openapi.11st.co.kr
// "개발가이드 > 상품검색"(categoryNo=54).
//
// 2026-09-02 확인: 응답은 XML, CP949(EUC-KR 계열) 인코딩. 최상위 wrapper 태그는
// <ProductSearchResponse><Products><Product>...</Product></Products></ProductSearchResponse>
// 지만, 특정 루트/컨테이너 태그에 의존하지 않고 <ProductCode> 등장 위치를 기준으로 상품
// 단위를 스스로 분리하는 방식으로 방어적으로 구현했다. API 키 유효기간이 180일이라는 정책이
// 있으니, 회원 안내에 이 점을 명시할 것.
//
// 실계정(buylifemall) E2E 검증 완료(2026-09-02, "무선청소기" 검색): 이미지/상세URL 필드는
// 문서 추정과 실제가 달랐다 — 이미지는 ImageUrl이 아니라 ProductImage/ProductImage100~300
// (사이즈별로 여러 개), 상세페이지 URL은 ProductDetailUrl이 아니라 DetailPageUrl, 판매자
// 표시명은 SellerNick(닉네임)이 Seller(아이디)보다 더 읽기 좋음 — 전부 실제 필드명으로 수정.

const BASE_URL = "https://openapi.11st.co.kr/openapi/OpenApiService.tmall";

export interface ElevenstProduct {
  productCode: string;
  title: string;
  imageUrl: string;
  detailUrl: string;
  priceKrw: number | null;
  salePriceKrw: number | null;
  seller: string | null;
}

/** <Tag>값</Tag> 또는 <Tag><![CDATA[값]]></Tag> 형태에서 값만 뽑는다. */
function extractField(xmlChunk: string, tag: string): string | null {
  const match = xmlChunk.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!match) return null;
  const raw = match[1];
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return (cdata ? cdata[1] : raw).trim();
}

/** <ProductCode> 등장 위치를 기준으로 상품 1건씩의 XML 조각으로 나눈다(루트 태그 불명이어도 동작). */
function splitProductChunks(xml: string): string[] {
  const indices: number[] = [];
  const re = /<ProductCode>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) indices.push(m.index);
  return indices.map((start, i) => xml.slice(start, i + 1 < indices.length ? indices[i + 1] : xml.length));
}

function parsePrice(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/[^0-9]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** 키워드로 11번가 상품을 검색한다(셀러 등록 불필요, 일반 Open API 등급). */
export async function searchProducts(
  keyword: string,
  auth: { apiKey: string; pageSize?: number },
): Promise<ElevenstProduct[]> {
  const params = new URLSearchParams({
    key: auth.apiKey,
    apiCode: "ProductSearch",
    keyword,
    pageNum: "1",
    pageSize: String(auth.pageSize ?? 30),
  });

  const response = await fetch(`${BASE_URL}?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`11번가 API 요청이 실패했습니다. (${response.status}) ${text.slice(0, 300)}`);
  }

  const buffer = await response.arrayBuffer();
  const xml = new TextDecoder("euc-kr").decode(buffer);

  const chunks = splitProductChunks(xml);

  if (chunks.length === 0) {
    // 상품이 0건이거나(정상), API 에러 메시지가 온 경우를 구분하기 위해 에러성 태그를 찾아본다.
    const errorMsg = extractField(xml, "ErrorMessage") ?? extractField(xml, "Message") ?? extractField(xml, "ResultMsg");
    if (errorMsg && !/success|정상/i.test(errorMsg)) {
      throw new Error(`11번가 API 오류: ${errorMsg}`);
    }
    return [];
  }

  return chunks.map((chunk) => ({
    productCode: extractField(chunk, "ProductCode") ?? "",
    title: extractField(chunk, "ProductName") ?? "",
    imageUrl: extractField(chunk, "ProductImage200") ?? extractField(chunk, "ProductImage") ?? "",
    detailUrl: (extractField(chunk, "DetailPageUrl") ?? "").replace(/^http:/, "https:"),
    priceKrw: parsePrice(extractField(chunk, "ProductPrice")),
    salePriceKrw: parsePrice(extractField(chunk, "SalePrice")),
    seller: extractField(chunk, "SellerNick") ?? extractField(chunk, "Seller"),
  }));
}
