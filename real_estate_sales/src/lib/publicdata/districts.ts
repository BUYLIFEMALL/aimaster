// 서울시 25개 자치구 법정동코드(앞 5자리, SGG_CD). 통계청/행정안전부 기준 고정 코드라 바뀌지 않는다.
export const SEOUL_DISTRICTS = [
  { sgg_cd: "11110", sgg_nm: "종로구" },
  { sgg_cd: "11140", sgg_nm: "중구" },
  { sgg_cd: "11170", sgg_nm: "용산구" },
  { sgg_cd: "11200", sgg_nm: "성동구" },
  { sgg_cd: "11215", sgg_nm: "광진구" },
  { sgg_cd: "11230", sgg_nm: "동대문구" },
  { sgg_cd: "11260", sgg_nm: "중랑구" },
  { sgg_cd: "11290", sgg_nm: "성북구" },
  { sgg_cd: "11305", sgg_nm: "강북구" },
  { sgg_cd: "11320", sgg_nm: "도봉구" },
  { sgg_cd: "11350", sgg_nm: "노원구" },
  { sgg_cd: "11380", sgg_nm: "은평구" },
  { sgg_cd: "11410", sgg_nm: "서대문구" },
  { sgg_cd: "11440", sgg_nm: "마포구" },
  { sgg_cd: "11470", sgg_nm: "양천구" },
  { sgg_cd: "11500", sgg_nm: "강서구" },
  { sgg_cd: "11530", sgg_nm: "구로구" },
  { sgg_cd: "11545", sgg_nm: "금천구" },
  { sgg_cd: "11560", sgg_nm: "영등포구" },
  { sgg_cd: "11590", sgg_nm: "동작구" },
  { sgg_cd: "11620", sgg_nm: "관악구" },
  { sgg_cd: "11650", sgg_nm: "서초구" },
  { sgg_cd: "11680", sgg_nm: "강남구" },
  { sgg_cd: "11710", sgg_nm: "송파구" },
  { sgg_cd: "11740", sgg_nm: "강동구" },
] as const;

// RE-B4(2026-10-30): 경기·인천. 서울 밖은 서울 열린데이터에 실거래가 없어 국토부 실거래 API(LAWD_CD = 이 5자리)로 받는다.
// 일반구가 있는 시는 구 단위 코드(국토부 신고 단위). 부천시는 2024-01 일반구 부활(원미·소사·오정).
// ⚠ 화성시는 2026-02 일반구 신설 예정이 있었으나 새 코드를 확인하지 못해 시 전체 코드(41590)로 둔다 — 국토부 키 승인 뒤 실제 조회로 확인할 것.
export const GYEONGGI_DISTRICTS = [
  { sgg_cd: "41111", sgg_nm: "수원시 장안구" },
  { sgg_cd: "41113", sgg_nm: "수원시 권선구" },
  { sgg_cd: "41115", sgg_nm: "수원시 팔달구" },
  { sgg_cd: "41117", sgg_nm: "수원시 영통구" },
  { sgg_cd: "41131", sgg_nm: "성남시 수정구" },
  { sgg_cd: "41133", sgg_nm: "성남시 중원구" },
  { sgg_cd: "41135", sgg_nm: "성남시 분당구" },
  { sgg_cd: "41150", sgg_nm: "의정부시" },
  { sgg_cd: "41171", sgg_nm: "안양시 만안구" },
  { sgg_cd: "41173", sgg_nm: "안양시 동안구" },
  { sgg_cd: "41192", sgg_nm: "부천시 원미구" },
  { sgg_cd: "41194", sgg_nm: "부천시 소사구" },
  { sgg_cd: "41196", sgg_nm: "부천시 오정구" },
  { sgg_cd: "41210", sgg_nm: "광명시" },
  { sgg_cd: "41220", sgg_nm: "평택시" },
  { sgg_cd: "41250", sgg_nm: "동두천시" },
  { sgg_cd: "41271", sgg_nm: "안산시 상록구" },
  { sgg_cd: "41273", sgg_nm: "안산시 단원구" },
  { sgg_cd: "41281", sgg_nm: "고양시 덕양구" },
  { sgg_cd: "41285", sgg_nm: "고양시 일산동구" },
  { sgg_cd: "41287", sgg_nm: "고양시 일산서구" },
  { sgg_cd: "41290", sgg_nm: "과천시" },
  { sgg_cd: "41310", sgg_nm: "구리시" },
  { sgg_cd: "41360", sgg_nm: "남양주시" },
  { sgg_cd: "41370", sgg_nm: "오산시" },
  { sgg_cd: "41390", sgg_nm: "시흥시" },
  { sgg_cd: "41410", sgg_nm: "군포시" },
  { sgg_cd: "41430", sgg_nm: "의왕시" },
  { sgg_cd: "41450", sgg_nm: "하남시" },
  { sgg_cd: "41461", sgg_nm: "용인시 처인구" },
  { sgg_cd: "41463", sgg_nm: "용인시 기흥구" },
  { sgg_cd: "41465", sgg_nm: "용인시 수지구" },
  { sgg_cd: "41480", sgg_nm: "파주시" },
  { sgg_cd: "41500", sgg_nm: "이천시" },
  { sgg_cd: "41550", sgg_nm: "안성시" },
  { sgg_cd: "41570", sgg_nm: "김포시" },
  { sgg_cd: "41590", sgg_nm: "화성시" },
  { sgg_cd: "41610", sgg_nm: "광주시" },
  { sgg_cd: "41630", sgg_nm: "양주시" },
  { sgg_cd: "41650", sgg_nm: "포천시" },
  { sgg_cd: "41670", sgg_nm: "여주시" },
  { sgg_cd: "41800", sgg_nm: "연천군" },
  { sgg_cd: "41820", sgg_nm: "가평군" },
  { sgg_cd: "41830", sgg_nm: "양평군" },
] as const;

export const INCHEON_DISTRICTS = [
  { sgg_cd: "28110", sgg_nm: "인천 중구" },
  { sgg_cd: "28140", sgg_nm: "인천 동구" },
  { sgg_cd: "28177", sgg_nm: "미추홀구" },
  { sgg_cd: "28185", sgg_nm: "연수구" },
  { sgg_cd: "28200", sgg_nm: "남동구" },
  { sgg_cd: "28237", sgg_nm: "부평구" },
  { sgg_cd: "28245", sgg_nm: "계양구" },
  { sgg_cd: "28260", sgg_nm: "인천 서구" },
  { sgg_cd: "28710", sgg_nm: "강화군" },
  { sgg_cd: "28720", sgg_nm: "옹진군" },
] as const;

export type Sido = "서울" | "경기" | "인천";
export const SIDO_GROUPS: { sido: Sido; districts: readonly { sgg_cd: string; sgg_nm: string }[] }[] = [
  { sido: "서울", districts: SEOUL_DISTRICTS },
  { sido: "경기", districts: GYEONGGI_DISTRICTS },
  { sido: "인천", districts: INCHEON_DISTRICTS },
];
export const ALL_DISTRICTS: readonly { sgg_cd: string; sgg_nm: string }[] = SIDO_GROUPS.flatMap((g) => g.districts);

export type DistrictCode = (typeof SEOUL_DISTRICTS)[number]["sgg_cd"];

/** 서울(11…)만 서울 열린데이터, 나머지는 국토부 실거래 API */
export const isSeoulDistrict = (sggCd: string) => sggCd.startsWith("11");

export function findDistrict(sggCd: string) {
  return ALL_DISTRICTS.find((d) => d.sgg_cd === sggCd) ?? null;
}

export function sidoOf(sggCd: string): Sido | null {
  return SIDO_GROUPS.find((g) => g.districts.some((d) => d.sgg_cd === sggCd))?.sido ?? null;
}

export function districtNameOf(sggCd: string): string {
  return findDistrict(sggCd)?.sgg_nm ?? sggCd;
}
