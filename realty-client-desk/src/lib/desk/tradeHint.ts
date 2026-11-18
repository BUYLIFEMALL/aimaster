// L-1(2026-11-19, docs/PLAN_20261119_DESK_CANDIDATES.md) — 매물 상세의 「이 동 최근 실거래」 한 줄.
// 실거래 프로그램이 모은 공공 실거래(real_estate_listings, 로그인 회원 읽기)를 읽기만 한다. 순수 함수만, 시험 tests/tradeHint.test.mjs.
// 원칙: 주소에서 시군구와 동을 둘 다 찾았을 때만 보여 준다. 이름이 같은 다른 시군구(서울 중구·부산 중구 등)가 섞이면
// 주소의 시·도로 가릴 수 있을 때만 쓰고, 못 가리면 아무것도 보여 주지 않는다(결과를 가정하지 않음).

/** 시·도 이름 → 시군구 코드 앞 2자리(행정 코드). 강원·전북은 특별자치도 전환 뒤 새 코드도 함께 */
const SIDO_PREFIX: [RegExp, string[]][] = [
  [/^서울/, ["11"]], [/^부산/, ["26"]], [/^대구/, ["27"]], [/^인천/, ["28"]], [/^광주/, ["29"]], [/^대전/, ["30"]], [/^울산/, ["31"]],
  [/^세종/, ["36"]], [/^경기/, ["41"]], [/^강원/, ["42", "51"]], [/^충북|^충청북/, ["43"]], [/^충남|^충청남/, ["44"]],
  [/^전북|^전라북/, ["45", "52"]], [/^전남|^전라남/, ["46"]], [/^경북|^경상북/, ["47"]], [/^경남|^경상남/, ["48"]], [/^제주/, ["50"]],
];

export interface AddressRegion {
  sidoPrefixes: string[] | null; // 주소에 시·도가 있으면 그 코드 앞자리, 없으면 null
  sggNm: string; // 실거래 표 sgg_nm 모양: 「종로구」「고양시 일산동구」「목포시」
  dong: string; // 법정동·읍·면·가: 「교남동」「백석동」「종로1가」
}

/** 주소 글자 → 시군구·동. 둘 중 하나라도 못 찾으면 null */
export function parseAddressRegion(address: string): AddressRegion | null {
  const t = String(address ?? "").trim().split(/\s+/).filter(Boolean);
  let sidoPrefixes: string[] | null = null;
  for (const w of t) {
    const hit = SIDO_PREFIX.find(([re]) => re.test(w));
    if (hit) { sidoPrefixes = hit[1]; break; }
  }
  for (let i = 1; i < t.length; i++) {
    const d = t[i];
    if (!/^[가-힣0-9]{1,10}(동|가|읍|면)$/.test(d) || /구$|시$|군$/.test(d)) continue;
    const prev = t[i - 1];
    if (!/[가-힣](구|시|군)$/.test(prev) || SIDO_PREFIX.some(([re]) => re.test(prev))) continue;
    // 「고양시 일산동구」처럼 시 아래 구면 시 이름까지 붙인다(실거래 표 sgg_nm 모양)
    const before = t[i - 2];
    const sggNm = /구$/.test(prev) && before && /[가-힣]시$/.test(before) && !SIDO_PREFIX.some(([re]) => re.test(before)) ? `${before} ${prev}` : prev;
    return { sidoPrefixes, sggNm, dong: d };
  }
  return null;
}

export interface TradeRow {
  sgg_cd: string | null;
  sgg_nm: string | null;
  stdg_nm: string | null;
  bldg_nm: string | null;
  deal_type: string | null;
  exclusive_area: number | null;
  price_amount: number | null; // 만 원
  monthly_rent?: number | null; // 만 원
  contract_date: string | null;
}

export type TradeHint = { status: "ok"; lines: string[] } | { status: "none" } | { status: "ambiguous" };

const won = (v: number) => (v >= 10000 ? `${(v / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억` : `${v.toLocaleString("ko-KR")}만`);

/** 같은 시군구·같은 동·같은 거래 종류의 최근 신고 최대 limit줄. 시군구가 둘 이상 섞이면(동명 지역) 시·도로 가리고, 못 가리면 ambiguous */
export function pickTradeHint(rows: readonly TradeRow[], region: AddressRegion, dealType: string, limit = 3): TradeHint {
  let same = rows.filter((r) => r.sgg_nm === region.sggNm && r.stdg_nm === region.dong && r.deal_type === dealType && r.sgg_cd && r.contract_date);
  if (region.sidoPrefixes) same = same.filter((r) => region.sidoPrefixes!.some((p) => r.sgg_cd!.startsWith(p)));
  if (new Set(same.map((r) => r.sgg_cd)).size > 1) return { status: "ambiguous" };
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
