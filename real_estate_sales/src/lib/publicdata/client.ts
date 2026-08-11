import "server-only";

// 서울 열린데이터광장 / 공공데이터포털 / VWorld 공공 API 클라이언트.
// Phase 0 스파이크로 확인됨: Vercel 서울 리전(icn1, vercel.json의 regions 설정)에서
// 직접 호출하면 세 API 모두 정상 응답한다 — n8n/Make 프록시가 필요 없다.
// 기존 Make 시나리오(@부동산 투자 자동화-국내IP Proxy.blueprint.json)의 호출 방식을
// 그대로 이식했다.

const SEOUL_BASE = "http://openapi.seoul.go.kr:8088";
const DATA_GO_KR_BASE = "http://apis.data.go.kr/1613000/BldRgstHubService";
const VWORLD_BASE = "https://api.vworld.kr/ned/data";

// VWorld 키는 원래 n8n.buylife.xyz 도메인으로 등록되어 있어(Phase 0 스파이크로 확인),
// 그 값을 그대로 domain 파라미터로 보내야 통과한다. 코드에 하드코딩하지 않고 환경변수로
// 빼둔 이유: VWorld 개발자 포털(vworld.kr)에서 도메인을 실제 서비스 도메인으로 바꾸면,
// 코드 배포 없이 Vercel 환경변수만 바꿔서 바로 반영할 수 있게 하기 위함
// (n8n 서버가 나중에 정리되어 이 도메인이 없어져도 코드가 깨지지 않도록 하는 안전장치).
const VWORLD_REGISTERED_DOMAIN = process.env.VWORLD_REGISTERED_DOMAIN ?? "n8n.buylife.xyz";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 ${name}가 설정되지 않았습니다.`);
  return v;
}

export interface SeoulRtmsRow {
  RCPT_YR: string;
  CGG_CD: string;
  CGG_NM: string;
  STDG_CD: string;
  STDG_NM: string;
  LOTNO_SE: string;
  LOTNO_SE_NM: string;
  MNO: string;
  SNO: string;
  BLDG_NM: string;
  CTRT_DAY: string;
  THING_AMT: string;
  ARCH_AREA: string;
  FLR: string;
  ARCH_YR?: string;
  RIGHT_SE?: string;
  [key: string]: string | undefined;
}

// 실거래가 목록 조회 (아파트 매매). numOfRows는 최대 1000.
export async function fetchSeoulTrades(params: {
  sggCd: string;
  year: number;
  numOfRows?: number;
}): Promise<SeoulRtmsRow[]> {
  const key = requireEnv("SEOUL_OPENDATA_API_KEY");
  const { sggCd, year, numOfRows = 1000 } = params;
  const url = `${SEOUL_BASE}/${key}/json/tbLnOpendataRtmsV/1/${numOfRows}/${year}/${sggCd}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`서울 실거래가 API 요청 실패 (${res.status})`);
  const data = await res.json();
  const rows: Record<string, unknown>[] = data?.tbLnOpendataRtmsV?.row ?? [];
  // 응답 필드가 문자열/숫자 어느 쪽으로도 올 수 있어, 이후 로직이 안전하게 문자열 메서드를
  // 쓸 수 있도록 여기서 한 번에 문자열로 통일한다.
  return rows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      normalized[k] = v === null || v === undefined ? "" : String(v);
    }
    return normalized as unknown as SeoulRtmsRow;
  });
}

export interface BuildingRegisterItem {
  platPlc: string;
  sigunguCd: string;
  bjdongCd: string;
  totArea?: string;
  exposPubuseGbCdNm?: string;
  area?: string;
  [key: string]: string | undefined;
}

// 건축물대장 표제부/전유부 조회 (전용면적 등)
export async function fetchBuildingRegister(params: {
  sigunguCd: string;
  bjdongCd: string;
  bun: string;
  ji: string;
}): Promise<BuildingRegisterItem[]> {
  const key = requireEnv("DATA_GO_KR_SERVICE_KEY");
  const { sigunguCd, bjdongCd, bun, ji } = params;
  const qs = new URLSearchParams({
    serviceKey: key,
    sigunguCd,
    bjdongCd,
    platGbCd: "0",
    bun,
    ji,
    _type: "json",
    numOfRows: "1000",
    pageNo: "1",
  });

  const res = await fetch(`${DATA_GO_KR_BASE}/getBrExposPubuseAreaInfo?${qs.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`건축물대장 API 요청 실패 (${res.status})`);
  const data = await res.json();
  return data?.response?.body?.items?.item ?? [];
}

export interface VworldPriceField {
  stdrYear: string;
  prvuseAr: string;
  pblntfPc: string;
  pnu: string;
  hoNm?: string;
  dongNm?: string;
  [key: string]: string | undefined;
}

// 공동주택 공시가격 조회 (PNU 19자리 필요)
export async function fetchApartAssessedPrice(params: {
  pnu: string;
  stdrYear: number;
  numOfRows?: number;
}): Promise<VworldPriceField[]> {
  const key = requireEnv("VWORLD_API_KEY");
  const { pnu, stdrYear, numOfRows = 10 } = params;
  const qs = new URLSearchParams({
    pnu,
    stdrYear: String(stdrYear),
    format: "json",
    numOfRows: String(numOfRows),
    pageNo: "1",
    key,
    domain: VWORLD_REGISTERED_DOMAIN,
  });

  const res = await fetch(`${VWORLD_BASE}/getApartHousingPriceAttr?${qs.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`VWorld 공시가격 API 요청 실패 (${res.status})`);
  const data = await res.json();
  const result = data?.apartHousingPrices;
  if (result?.resultCode && result.resultCode !== "0" && Array.isArray(result?.field) === false) {
    // resultCode가 있고 field 배열이 없으면 에러 응답 (예: INCORRECT_KEY)
    if (!result.field) return [];
  }
  return result?.field ?? [];
}

// 실제 필드명(GRFE=보증금, RTFE=월세, RENT_SE=전세/월세 구분)은 서울 열린데이터광장
// 문서상 명칭과 실제 응답이 달라서, 직접 호출해서 확인한 값을 그대로 반영했다.
export interface SeoulRentRow {
  CGG_CD: string;
  CGG_NM: string;
  STDG_CD: string;
  STDG_NM: string;
  BLDG_NM: string;
  CTRT_DAY: string;
  RENT_SE: string; // "전세" | "월세"
  GRFE: string; // 보증금(만원)
  RTFE: string; // 월세(만원)
  [key: string]: string | undefined;
}

// 전월세 비교 데이터 조회 (같은 건물의 최근 전월세 시세 참고용).
// 이 API는 건물명으로 서버 필터링이 되지 않아(직접 확인: 요청한 건물명과 무관하게 해당
// 법정동 전체 결과가 돌아옴), 동 단위로 넉넉히 받아온 뒤 건물명으로 클라이언트에서
// 필터링하고 최신 계약일 순으로 정렬해서 반환한다.
export async function fetchSeoulRentComparables(params: {
  sggCd: string;
  sggNm: string;
  stdgCd: string;
  bldgNm: string;
  year: number;
}): Promise<SeoulRentRow[]> {
  const key = requireEnv("SEOUL_OPENDATA_API_KEY");
  const { sggCd, sggNm, stdgCd, bldgNm, year } = params;
  const url = `${SEOUL_BASE}/${key}/json/tbLnOpendataRentV/1/1000/${year}/${sggCd}/${encodeURIComponent(sggNm)}/${stdgCd}/`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`서울 전월세 API 요청 실패 (${res.status})`);
  const data = await res.json();
  const rows: SeoulRentRow[] = data?.tbLnOpendataRentV?.row ?? [];

  const normalizedTarget = bldgNm.trim();
  return rows
    .filter((r) => r.BLDG_NM && r.BLDG_NM.trim() === normalizedTarget)
    .sort((a, b) => (b.CTRT_DAY ?? "").localeCompare(a.CTRT_DAY ?? ""));
}

export interface VworldLandPriceField {
  pnu: string;
  stdrYear: string;
  stdrMt: string;
  pblntfDe: string;
  pblntfPclnd: string; // 개별공시지가 (원/㎡)
  lastUpdtDt: string;
  [key: string]: string | undefined;
}

// 개별공시지가 조회 (PNU 19자리 필요). 같은 stdrYear에도 정정 등으로 여러 행이 올 수 있어
// 호출부에서 lastUpdtDt 기준 최신 행을 골라 써야 한다.
export async function fetchLandPrice(params: {
  pnu: string;
  stdrYear: number;
  numOfRows?: number;
}): Promise<VworldLandPriceField[]> {
  const key = requireEnv("VWORLD_API_KEY");
  const { pnu, stdrYear, numOfRows = 10 } = params;
  const qs = new URLSearchParams({
    pnu,
    stdrYear: String(stdrYear),
    format: "json",
    numOfRows: String(numOfRows),
    pageNo: "1",
    key,
    domain: VWORLD_REGISTERED_DOMAIN,
  });

  const res = await fetch(`${VWORLD_BASE}/getIndvdLandPriceAttr?${qs.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`VWorld 개별공시지가 API 요청 실패 (${res.status})`);
  const data = await res.json();
  return data?.indvdLandPrices?.field ?? [];
}

export interface VworldLandUseField {
  pnu: string;
  prposAreaDstrcCode: string;
  prposAreaDstrcCodeNm: string; // 용도지역/지구/구역명 (예: 제2종일반주거지역, 과밀억제권역)
  cnflcAtNm: string; // 포함 | 저촉
  [key: string]: string | undefined;
}

// 토지이용계획(용도지역·지구·구역) 조회. 한 필지에 여러 지구/구역이 동시에 걸쳐있는 게
// 일반적이라(용도지역 + 각종 규제구역) 배열 전체를 반환한다.
export async function fetchLandUsePlan(params: {
  pnu: string;
  numOfRows?: number;
}): Promise<VworldLandUseField[]> {
  const key = requireEnv("VWORLD_API_KEY");
  const { pnu, numOfRows = 100 } = params;
  const qs = new URLSearchParams({
    pnu,
    format: "json",
    numOfRows: String(numOfRows),
    pageNo: "1",
    key,
    domain: VWORLD_REGISTERED_DOMAIN,
  });

  const res = await fetch(`${VWORLD_BASE}/getLandUseAttr?${qs.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`VWorld 토지이용계획 API 요청 실패 (${res.status})`);
  const data = await res.json();
  return data?.landUses?.field ?? [];
}

// 서울 열린데이터광장 응답은 필드가 문자열/숫자 어느 쪽으로도 올 수 있어 항상 String()으로 보정한다.
function s(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

// 기존 Make 시나리오의 "고유ID" 로직과 동일 (계약일-법정동-건물명-면적-금액-층)
export function buildDedupKey(row: SeoulRtmsRow): string {
  return [row.CTRT_DAY, row.STDG_NM, row.BLDG_NM, row.ARCH_AREA, row.THING_AMT, row.FLR]
    .map(s)
    .join("-");
}

// PNU(19자리) = 시군구코드(5) + 법정동코드(5) + 지목구분(1, 1=대지 2=산) + 본번(4) + 부번(4)
export function buildPnu(row: SeoulRtmsRow): string {
  const jimok = s(row.LOTNO_SE) === "2" ? "2" : "1";
  const bun = s(row.MNO || "0").padStart(4, "0");
  const ji = s(row.SNO || "0").padStart(4, "0");
  return `${s(row.CGG_CD)}${s(row.STDG_CD)}${jimok}${bun}${ji}`;
}
