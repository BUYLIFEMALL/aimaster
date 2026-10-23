import "server-only";

// 도매매(dome.co.kr, 도매꾹과 아이디/API 공유) Open API 클라이언트("server-only" 가드).
// "상품리스트"(mode=getItemList) API — 승인 절차 없이 API Key 발급 즉시 사용 가능한
// Open API 등급. 공식 문서: openapi.domeggook.com "상품조회 > 상품리스트".
// market=supply로 고정해 도매매(위탁소싱, 소량구매 가능) 결과만 받는다 — market=dome은
// 도매꾹(대량 사입 전용)이라 개인 셀러의 소싱 목적과 맞지 않아 의도적으로 제외.
//
// 2026-09-01 확인: 엔드포인트는 2026-08-11 공지("[중요] openAPI Endpoint 변경 안내")로
// domeggook.com → www.domeggook.com 으로 바뀐 최신 주소를 쓰고 있고(구 주소는 자동
// 리다이렉트되지만 지연 발생 가능), getItemList는 공식 "Open API" 카테고리 소속이라
// Private API 승인 없이 바로 호출 가능함을 문서로 재확인했다.
//
// 다만 문서 페이지의 응답 예시가 접이식 UI라 스크래핑으로 완전히 확인되지 않아,
// 최상위 wrapper 키("domeggook")는 XML 예시(<domeggook><header/><list/></domeggook>)를
// 근거로 한 추정이다. 실제 응답이 다를 가능성에 대비해 findList/findHeader가 여러
// 후보 경로를 순서대로 탐색하도록 방어적으로 작성했다 — 실계정 검증 시 실제 구조가
// 확인되면 이 탐색 순서를 정리해도 된다.

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

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

/** 후보 경로들을 순서대로 시도해서 처음 발견되는 객체를 반환한다(대소문자 무시). */
function findByPaths(root: unknown, paths: string[][]): unknown {
  for (const path of paths) {
    let cur: unknown = root;
    for (const key of path) {
      if (!isObject(cur)) {
        cur = undefined;
        break;
      }
      const matchKey = Object.keys(cur).find((k) => k.toLowerCase() === key.toLowerCase());
      cur = matchKey ? cur[matchKey] : undefined;
    }
    if (cur !== undefined) return cur;
  }
  return undefined;
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

  const data: unknown = await response.json();

  const header = findByPaths(data, [["domeggook", "header"], ["header"], ["result", "header"], ["response", "header"]]);
  const errMsg = isObject(header) ? (header.errMsg as string | undefined) ?? (header.errmsg as string | undefined) : undefined;
  if (errMsg) {
    throw new Error(`도매매 API 오류: ${errMsg}`);
  }

  const rawList = findByPaths(data, [
    ["domeggook", "list", "item"],
    ["list", "item"],
    ["result", "list", "item"],
    ["response", "list", "item"],
    ["domeggook", "items"],
    ["items"],
  ]);

  const items: DomeggookRawItem[] = !rawList
    ? []
    : Array.isArray(rawList)
      ? (rawList as DomeggookRawItem[])
      : [rawList as DomeggookRawItem];

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
