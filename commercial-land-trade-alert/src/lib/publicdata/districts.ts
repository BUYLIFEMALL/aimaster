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
// 2026-10-30 국토교통부 전국 법정동 자료(realty-listing-alert/public/regions.json)와 전부 대조: 화성시는 만세·효행·병점·동탄구(41591~41597, 옛 41590은 0건),
// 인천은 제물포구(28125)·영종구(28155)·서해구(28275)·검단구(28290)로 개편(옛 중구 28110·동구 28140·서구 28260 없음). 행정구역이 또 바뀌면 그 파일과 다시 대조한다.
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
  { sgg_cd: "41591", sgg_nm: "화성시 만세구" },
  { sgg_cd: "41593", sgg_nm: "화성시 효행구" },
  { sgg_cd: "41595", sgg_nm: "화성시 병점구" },
  { sgg_cd: "41597", sgg_nm: "화성시 동탄구" },
  { sgg_cd: "41610", sgg_nm: "광주시" },
  { sgg_cd: "41630", sgg_nm: "양주시" },
  { sgg_cd: "41650", sgg_nm: "포천시" },
  { sgg_cd: "41670", sgg_nm: "여주시" },
  { sgg_cd: "41800", sgg_nm: "연천군" },
  { sgg_cd: "41820", sgg_nm: "가평군" },
  { sgg_cd: "41830", sgg_nm: "양평군" },
] as const;

export const INCHEON_DISTRICTS = [
  { sgg_cd: "28125", sgg_nm: "제물포구" },
  { sgg_cd: "28155", sgg_nm: "영종구" },
  { sgg_cd: "28177", sgg_nm: "미추홀구" },
  { sgg_cd: "28185", sgg_nm: "연수구" },
  { sgg_cd: "28200", sgg_nm: "남동구" },
  { sgg_cd: "28237", sgg_nm: "부평구" },
  { sgg_cd: "28245", sgg_nm: "계양구" },
  { sgg_cd: "28275", sgg_nm: "서해구" },
  { sgg_cd: "28290", sgg_nm: "검단구" },
  { sgg_cd: "28710", sgg_nm: "강화군" },
  { sgg_cd: "28720", sgg_nm: "옹진군" },
] as const;

// 서울·경기·인천 밖 시·군·구(2026-10-31 생성). 다음 줄은 scripts/build-national-regions.mjs가 바꾼다.
export const OTHER_SIDO_GROUPS: { sido: string; districts: readonly { sgg_cd: string; sgg_nm: string }[] }[] = [{"sido":"전남광주","districts":[{"sgg_cd":"12110","sgg_nm":"목포시"},{"sgg_cd":"12130","sgg_nm":"여수시"},{"sgg_cd":"12150","sgg_nm":"순천시"},{"sgg_cd":"12170","sgg_nm":"나주시"},{"sgg_cd":"12190","sgg_nm":"광양시"},{"sgg_cd":"12210","sgg_nm":"동구"},{"sgg_cd":"12240","sgg_nm":"서구"},{"sgg_cd":"12270","sgg_nm":"남구"},{"sgg_cd":"12300","sgg_nm":"북구"},{"sgg_cd":"12330","sgg_nm":"광산구"},{"sgg_cd":"12710","sgg_nm":"담양군"},{"sgg_cd":"12720","sgg_nm":"곡성군"},{"sgg_cd":"12730","sgg_nm":"구례군"},{"sgg_cd":"12740","sgg_nm":"고흥군"},{"sgg_cd":"12750","sgg_nm":"보성군"},{"sgg_cd":"12760","sgg_nm":"화순군"},{"sgg_cd":"12770","sgg_nm":"장흥군"},{"sgg_cd":"12780","sgg_nm":"강진군"},{"sgg_cd":"12790","sgg_nm":"해남군"},{"sgg_cd":"12800","sgg_nm":"영암군"},{"sgg_cd":"12810","sgg_nm":"무안군"},{"sgg_cd":"12820","sgg_nm":"함평군"},{"sgg_cd":"12830","sgg_nm":"영광군"},{"sgg_cd":"12840","sgg_nm":"장성군"},{"sgg_cd":"12850","sgg_nm":"완도군"},{"sgg_cd":"12860","sgg_nm":"진도군"},{"sgg_cd":"12870","sgg_nm":"신안군"}]},{"sido":"부산","districts":[{"sgg_cd":"26110","sgg_nm":"중구"},{"sgg_cd":"26140","sgg_nm":"서구"},{"sgg_cd":"26170","sgg_nm":"동구"},{"sgg_cd":"26200","sgg_nm":"영도구"},{"sgg_cd":"26230","sgg_nm":"부산진구"},{"sgg_cd":"26260","sgg_nm":"동래구"},{"sgg_cd":"26290","sgg_nm":"남구"},{"sgg_cd":"26320","sgg_nm":"북구"},{"sgg_cd":"26350","sgg_nm":"해운대구"},{"sgg_cd":"26380","sgg_nm":"사하구"},{"sgg_cd":"26410","sgg_nm":"금정구"},{"sgg_cd":"26440","sgg_nm":"강서구"},{"sgg_cd":"26470","sgg_nm":"연제구"},{"sgg_cd":"26500","sgg_nm":"수영구"},{"sgg_cd":"26530","sgg_nm":"사상구"},{"sgg_cd":"26710","sgg_nm":"기장군"}]},{"sido":"대구","districts":[{"sgg_cd":"27110","sgg_nm":"중구"},{"sgg_cd":"27140","sgg_nm":"동구"},{"sgg_cd":"27170","sgg_nm":"서구"},{"sgg_cd":"27200","sgg_nm":"남구"},{"sgg_cd":"27230","sgg_nm":"북구"},{"sgg_cd":"27260","sgg_nm":"수성구"},{"sgg_cd":"27290","sgg_nm":"달서구"},{"sgg_cd":"27710","sgg_nm":"달성군"},{"sgg_cd":"27720","sgg_nm":"군위군"}]},{"sido":"대전","districts":[{"sgg_cd":"30110","sgg_nm":"동구"},{"sgg_cd":"30140","sgg_nm":"중구"},{"sgg_cd":"30170","sgg_nm":"서구"},{"sgg_cd":"30200","sgg_nm":"유성구"},{"sgg_cd":"30230","sgg_nm":"대덕구"}]},{"sido":"울산","districts":[{"sgg_cd":"31110","sgg_nm":"중구"},{"sgg_cd":"31140","sgg_nm":"남구"},{"sgg_cd":"31170","sgg_nm":"동구"},{"sgg_cd":"31200","sgg_nm":"북구"},{"sgg_cd":"31710","sgg_nm":"울주군"}]},{"sido":"세종","districts":[{"sgg_cd":"36110","sgg_nm":"세종시"}]},{"sido":"충북","districts":[{"sgg_cd":"43111","sgg_nm":"청주시 상당구"},{"sgg_cd":"43112","sgg_nm":"청주시 서원구"},{"sgg_cd":"43113","sgg_nm":"청주시 흥덕구"},{"sgg_cd":"43114","sgg_nm":"청주시 청원구"},{"sgg_cd":"43130","sgg_nm":"충주시"},{"sgg_cd":"43150","sgg_nm":"제천시"},{"sgg_cd":"43720","sgg_nm":"보은군"},{"sgg_cd":"43730","sgg_nm":"옥천군"},{"sgg_cd":"43740","sgg_nm":"영동군"},{"sgg_cd":"43745","sgg_nm":"증평군"},{"sgg_cd":"43750","sgg_nm":"진천군"},{"sgg_cd":"43760","sgg_nm":"괴산군"},{"sgg_cd":"43770","sgg_nm":"음성군"},{"sgg_cd":"43800","sgg_nm":"단양군"}]},{"sido":"충남","districts":[{"sgg_cd":"44131","sgg_nm":"천안시 동남구"},{"sgg_cd":"44133","sgg_nm":"천안시 서북구"},{"sgg_cd":"44150","sgg_nm":"공주시"},{"sgg_cd":"44180","sgg_nm":"보령시"},{"sgg_cd":"44200","sgg_nm":"아산시"},{"sgg_cd":"44210","sgg_nm":"서산시"},{"sgg_cd":"44230","sgg_nm":"논산시"},{"sgg_cd":"44250","sgg_nm":"계룡시"},{"sgg_cd":"44270","sgg_nm":"당진시"},{"sgg_cd":"44710","sgg_nm":"금산군"},{"sgg_cd":"44760","sgg_nm":"부여군"},{"sgg_cd":"44770","sgg_nm":"서천군"},{"sgg_cd":"44790","sgg_nm":"청양군"},{"sgg_cd":"44800","sgg_nm":"홍성군"},{"sgg_cd":"44810","sgg_nm":"예산군"},{"sgg_cd":"44825","sgg_nm":"태안군"}]},{"sido":"경북","districts":[{"sgg_cd":"47111","sgg_nm":"포항시 남구"},{"sgg_cd":"47113","sgg_nm":"포항시 북구"},{"sgg_cd":"47130","sgg_nm":"경주시"},{"sgg_cd":"47150","sgg_nm":"김천시"},{"sgg_cd":"47170","sgg_nm":"안동시"},{"sgg_cd":"47190","sgg_nm":"구미시"},{"sgg_cd":"47210","sgg_nm":"영주시"},{"sgg_cd":"47230","sgg_nm":"영천시"},{"sgg_cd":"47250","sgg_nm":"상주시"},{"sgg_cd":"47280","sgg_nm":"문경시"},{"sgg_cd":"47290","sgg_nm":"경산시"},{"sgg_cd":"47730","sgg_nm":"의성군"},{"sgg_cd":"47750","sgg_nm":"청송군"},{"sgg_cd":"47760","sgg_nm":"영양군"},{"sgg_cd":"47770","sgg_nm":"영덕군"},{"sgg_cd":"47820","sgg_nm":"청도군"},{"sgg_cd":"47830","sgg_nm":"고령군"},{"sgg_cd":"47840","sgg_nm":"성주군"},{"sgg_cd":"47850","sgg_nm":"칠곡군"},{"sgg_cd":"47900","sgg_nm":"예천군"},{"sgg_cd":"47920","sgg_nm":"봉화군"},{"sgg_cd":"47930","sgg_nm":"울진군"},{"sgg_cd":"47940","sgg_nm":"울릉군"}]},{"sido":"경남","districts":[{"sgg_cd":"48121","sgg_nm":"창원시 의창구"},{"sgg_cd":"48123","sgg_nm":"창원시 성산구"},{"sgg_cd":"48125","sgg_nm":"창원시 마산합포구"},{"sgg_cd":"48127","sgg_nm":"창원시 마산회원구"},{"sgg_cd":"48129","sgg_nm":"창원시 진해구"},{"sgg_cd":"48170","sgg_nm":"진주시"},{"sgg_cd":"48220","sgg_nm":"통영시"},{"sgg_cd":"48240","sgg_nm":"사천시"},{"sgg_cd":"48250","sgg_nm":"김해시"},{"sgg_cd":"48270","sgg_nm":"밀양시"},{"sgg_cd":"48310","sgg_nm":"거제시"},{"sgg_cd":"48330","sgg_nm":"양산시"},{"sgg_cd":"48720","sgg_nm":"의령군"},{"sgg_cd":"48730","sgg_nm":"함안군"},{"sgg_cd":"48740","sgg_nm":"창녕군"},{"sgg_cd":"48820","sgg_nm":"고성군"},{"sgg_cd":"48840","sgg_nm":"남해군"},{"sgg_cd":"48850","sgg_nm":"하동군"},{"sgg_cd":"48860","sgg_nm":"산청군"},{"sgg_cd":"48870","sgg_nm":"함양군"},{"sgg_cd":"48880","sgg_nm":"거창군"},{"sgg_cd":"48890","sgg_nm":"합천군"}]},{"sido":"제주","districts":[{"sgg_cd":"50110","sgg_nm":"제주시"},{"sgg_cd":"50130","sgg_nm":"서귀포시"}]},{"sido":"강원","districts":[{"sgg_cd":"51110","sgg_nm":"춘천시"},{"sgg_cd":"51130","sgg_nm":"원주시"},{"sgg_cd":"51150","sgg_nm":"강릉시"},{"sgg_cd":"51170","sgg_nm":"동해시"},{"sgg_cd":"51190","sgg_nm":"태백시"},{"sgg_cd":"51210","sgg_nm":"속초시"},{"sgg_cd":"51230","sgg_nm":"삼척시"},{"sgg_cd":"51720","sgg_nm":"홍천군"},{"sgg_cd":"51730","sgg_nm":"횡성군"},{"sgg_cd":"51750","sgg_nm":"영월군"},{"sgg_cd":"51760","sgg_nm":"평창군"},{"sgg_cd":"51770","sgg_nm":"정선군"},{"sgg_cd":"51780","sgg_nm":"철원군"},{"sgg_cd":"51790","sgg_nm":"화천군"},{"sgg_cd":"51800","sgg_nm":"양구군"},{"sgg_cd":"51810","sgg_nm":"인제군"},{"sgg_cd":"51820","sgg_nm":"고성군"},{"sgg_cd":"51830","sgg_nm":"양양군"}]},{"sido":"전북","districts":[{"sgg_cd":"52111","sgg_nm":"전주시 완산구"},{"sgg_cd":"52113","sgg_nm":"전주시 덕진구"},{"sgg_cd":"52130","sgg_nm":"군산시"},{"sgg_cd":"52140","sgg_nm":"익산시"},{"sgg_cd":"52180","sgg_nm":"정읍시"},{"sgg_cd":"52190","sgg_nm":"남원시"},{"sgg_cd":"52210","sgg_nm":"김제시"},{"sgg_cd":"52710","sgg_nm":"완주군"},{"sgg_cd":"52720","sgg_nm":"진안군"},{"sgg_cd":"52730","sgg_nm":"무주군"},{"sgg_cd":"52740","sgg_nm":"장수군"},{"sgg_cd":"52750","sgg_nm":"임실군"},{"sgg_cd":"52770","sgg_nm":"순창군"},{"sgg_cd":"52790","sgg_nm":"고창군"},{"sgg_cd":"52800","sgg_nm":"부안군"}]}];

export type Sido = string;
export const SIDO_GROUPS: { sido: Sido; districts: readonly { sgg_cd: string; sgg_nm: string }[] }[] = [
  { sido: "서울", districts: SEOUL_DISTRICTS },
  { sido: "경기", districts: GYEONGGI_DISTRICTS },
  { sido: "인천", districts: INCHEON_DISTRICTS },
  ...OTHER_SIDO_GROUPS, // 2026-10-31 전국 확장
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

/** 감시 지역 화면용(2026-10-30): 「수원시 장안구」처럼 구가 여러 개인 시는 시 이름으로 묶고, 나머지 시·군은 한 묶음(city = null) */
export function groupByCity<T extends { sgg_nm: string }>(districts: readonly T[]) {
  const cityOf = (d: T) => (d.sgg_nm.includes(" ") ? d.sgg_nm.split(" ")[0] : null);
  const groups: { city: string | null; items: T[] }[] = [];
  for (const d of districts) {
    const city = cityOf(d);
    const multi = city !== null && districts.filter((x) => cityOf(x) === city).length > 1;
    const key = multi ? city : null;
    let g = groups.find((x) => x.city === key);
    if (!g) groups.push((g = { city: key, items: [] }));
    g.items.push(d);
  }
  return [...groups.filter((g) => g.city !== null), ...groups.filter((g) => g.city === null)];
}

export function districtNameOf(sggCd: string): string {
  return findDistrict(sggCd)?.sgg_nm ?? sggCd;
}
