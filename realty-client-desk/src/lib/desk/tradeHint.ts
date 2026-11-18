// L-1(2026-11-19, docs/PLAN_20261119_DESK_CANDIDATES.md) — 매물 상세의 「이 동 최근 실거래」 한 줄.
// 실거래 프로그램이 모은 공공 실거래(real_estate_listings, 로그인 회원 읽기)를 읽기만 한다. 순수 함수만, 시험 tests/tradeHint.test.mjs.
// 원칙(Master msg_d05ff0a510fa 보완): 조회 전에 주소를 시군구 목록(districts.ts 사본, 인자로 받음)으로 「하나의 시군구 코드」로 정한다.
//   - 주소에서 시군구와 동을 둘 다 찾아야 함
//   - 같은 이름의 시군구가 여러 곳(서울·부산 중구 등)이면 주소의 시·도 글자로 하나로 가려질 때만
//   - 못 가리면 조회도 표시도 하지 않는다(결과를 가정하지 않음). 조회는 그 코드(sgg_cd)로만 한다.

/** 주소의 시·도 글자 → 목록의 시·도 묶음 이름. 광주·전남은 목록에서 한 묶음(전남광주, 코드 12…) */
const SIDO_ALIASES: [RegExp, string][] = [
  [/^서울/, "서울"], [/^경기/, "경기"], [/^인천/, "인천"], [/^부산/, "부산"], [/^대구/, "대구"], [/^대전/, "대전"], [/^울산/, "울산"],
  [/^세종/, "세종"], [/^광주/, "전남광주"], [/^전남|^전라남/, "전남광주"], [/^충북|^충청북/, "충북"], [/^충남|^충청남/, "충남"],
  [/^경북|^경상북/, "경북"], [/^경남|^경상남/, "경남"], [/^제주/, "제주"], [/^강원/, "강원"], [/^전북|^전라북/, "전북"],
];
const sidoOfToken = (w: string) => SIDO_ALIASES.find(([re]) => re.test(w))?.[1] ?? null;

export interface ResolvedRegion {
  sggCd: string; // 실거래 표 sgg_cd(조회 조건)
  sggNm: string; // 화면 표시용
  dong: string; // 법정동·읍·면·가: 「교남동」「백석동」「종로1가」
}

/** 주소 글자 → 하나의 시군구 코드 + 동. 시군구·동을 못 찾거나 같은 이름 시군구를 못 가리면 null */
export function resolveAddressRegion(address: string, districts: readonly (readonly [string, string, string])[]): ResolvedRegion | null {
  const t = String(address ?? "").trim().split(/\s+/).filter(Boolean);
  let sido: string | null = null;
  for (const w of t) {
    const s = sidoOfToken(w);
    if (s) { sido = s; break; }
  }
  for (let i = 1; i < t.length; i++) {
    const d = t[i];
    if (!/^[가-힣0-9]{1,10}(동|가|읍|면)$/.test(d) || /구$|시$|군$/.test(d)) continue;
    const prev = t[i - 1];
    if (!/[가-힣](구|시|군)$/.test(prev) || sidoOfToken(prev)) continue;
    // 「고양시 일산동구」처럼 시 아래 구면 시 이름까지 붙인다(목록 sgg_nm 모양)
    const before = t[i - 2];
    const sggNm = /구$/.test(prev) && before && /[가-힣]시$/.test(before) && !sidoOfToken(before) ? `${before} ${prev}` : prev;
    let hits = districts.filter(([, nm]) => nm === sggNm);
    if (sido) hits = hits.filter(([, , s]) => s === sido);
    if (hits.length !== 1) return null; // 없음 또는 동명 시군구를 못 가림 → 조회하지 않음
    return { sggCd: hits[0][0], sggNm, dong: d };
  }
  return null;
}

export interface TradeRow {
  sgg_cd: string | null;
  stdg_nm: string | null;
  bldg_nm: string | null;
  deal_type: string | null;
  exclusive_area: number | null;
  price_amount: number | null; // 만 원
  monthly_rent?: number | null; // 만 원
  contract_date: string | null; // 계약일(공공 실거래 CTRT_DAY)
}

/** ok = 보여 줄 줄, none = 자료 없음(안내), error = 조회 실패(아무것도 보여 주지 않음) */
export type TradeHint = { status: "ok"; lines: string[] } | { status: "none" } | { status: "error" };

const won = (v: number) => (v >= 10000 ? `${(v / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억` : `${v.toLocaleString("ko-KR")}만`);

/** 조회 결과 → 화면 줄. 조회 조건(코드·동·거래 종류)과 맞지 않는 행은 한 번 더 버린다. 최근 계약일 순 최대 limit줄 */
export function toTradeHint(result: { data: readonly TradeRow[] | null; error: unknown }, region: ResolvedRegion, dealType: string, limit = 3): TradeHint {
  if (result.error) return { status: "error" };
  const same = (result.data ?? []).filter((r) => r.sgg_cd === region.sggCd && r.stdg_nm === region.dong && r.deal_type === dealType && r.contract_date);
  if (same.length === 0) return { status: "none" };
  const lines = [...same]
    .sort((a, b) => String(b.contract_date).localeCompare(String(a.contract_date)))
    .slice(0, limit)
    .map((r) => {
      const price = r.price_amount == null ? "가격 없음" : dealType === "월세" ? `보증금 ${won(r.price_amount)}/월 ${won(r.monthly_rent ?? 0)}` : won(r.price_amount);
      const area = r.exclusive_area ? ` · 전용 ${Number(r.exclusive_area).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡` : "";
      return `${String(r.contract_date).slice(0, 10)} · ${r.bldg_nm || "이름 없음"}${area} · ${price}`;
    });
  return { status: "ok", lines };
}
