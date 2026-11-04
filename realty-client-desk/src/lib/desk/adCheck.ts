// 4단계(2026-11-03): 중개대상물 표시·광고 명시 항목 점검(순수 함수 — node --test로 시험). 자동 보정·자동 게시 없음, 빠진 항목만 알려 준다.
// 근거: 공인중개사법 제18조의2·시행령 제17조의2, 「중개대상물의 표시·광고 명시사항 세부기준」(국토부 고시, 2025-01-01 시행 개정판 해설 기준).
// 중개사무소: 명칭·소재지·연락처·등록번호·개업공인중개사 성명. 인터넷 광고 물건: 소재지·면적(전용)·가격·종류·거래형태,
// 건축물이면 총 층수·사용승인일·방향·방/욕실 수·입주가능일·주차대수·관리비. 참고용(법률 자문 아님).

export type CheckOffice = { office_name?: string | null; office_phone?: string | null; office_address?: string | null; reg_no?: string | null; broker_name?: string | null } | null;
export type CheckListing = {
  address: string | null; area_m2: number | null; price: number | null; property_type: string | null; deal_type: string | null;
  floor_info: string | null; approval_date: string | null; direction: string | null; rooms: number | null; baths: number | null;
  move_in: string | null; parking: string | null; mgmt_fee: string | null;
};

// v1.09: 다세대/빌라·다가구/주택으로 나눔, 건물 추가. 분양권은 아직 지어지지 않은 집이라 건축물 항목을 묻지 않는다
const BUILDINGS = ["아파트", "다세대/빌라", "다가구/주택", "오피스텔", "상가", "사무실", "건물", "빌라·주택"];
const HOMES = ["아파트", "다세대/빌라", "다가구/주택", "오피스텔", "빌라·주택"];
const blank = (v: unknown) => v === null || v === undefined || String(v).trim() === "";

/** 빠진 명시 항목(사무소 · 매물) */
export function missingAdItems(l: CheckListing, o: CheckOffice): { office: string[]; listing: string[] } {
  const office: string[] = [];
  if (blank(o?.office_name)) office.push("중개사무소 명칭");
  if (blank(o?.office_address)) office.push("중개사무소 소재지");
  if (blank(o?.office_phone)) office.push("중개사무소 연락처");
  if (blank(o?.reg_no)) office.push("중개사무소 등록번호");
  if (blank(o?.broker_name)) office.push("개업공인중개사 성명");
  const listing: string[] = [];
  if (blank(l.address)) listing.push("소재지");
  if (blank(l.area_m2)) listing.push("전용면적(㎡)");
  if (blank(l.price)) listing.push("가격");
  if (blank(l.property_type)) listing.push("매물 종류");
  if (blank(l.deal_type)) listing.push("거래 형태");
  if (l.property_type && BUILDINGS.includes(l.property_type)) {
    if (blank(l.floor_info) || !/\d+\s*층?\s*\/\s*\d+/.test(String(l.floor_info))) listing.push("층(해당 층/총 층수)");
    if (blank(l.approval_date)) listing.push("사용승인일");
    if (blank(l.direction)) listing.push("방향");
    if (HOMES.includes(l.property_type) && (blank(l.rooms) || blank(l.baths))) listing.push("방·욕실 수");
    if (blank(l.move_in)) listing.push("입주 가능일");
    if (blank(l.parking)) listing.push("주차 대수");
    if (blank(l.mgmt_fee)) listing.push("관리비");
  }
  return { office, listing };
}

// 허위·과장으로 오해받기 쉬운 표현(표시광고법·공인중개사법 부당 표시·광고 예시 참고). 쓰지 말라는 「주의」로만 알려 준다.
const RISKY = ["최저가", "확정 수익", "수익 보장", "무조건", "100%", "투자 가치 보장", "프리미엄 보장", "시세보다 무조건", "급등 예정", "개발 확정"];

/** 글에서 주의할 표현 찾기 */
export function riskyPhrases(text: string): string[] {
  return RISKY.filter((w) => text.includes(w));
}
