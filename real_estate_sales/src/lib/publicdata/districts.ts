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

export type DistrictCode = (typeof SEOUL_DISTRICTS)[number]["sgg_cd"];

export function districtNameOf(sggCd: string): string {
  return SEOUL_DISTRICTS.find((d) => d.sgg_cd === sggCd)?.sgg_nm ?? sggCd;
}
