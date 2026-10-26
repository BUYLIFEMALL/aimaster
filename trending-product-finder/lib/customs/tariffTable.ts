// EC-W7(2026-10-26): 수입 관세율 참고표(/fees#tariff). 2026-10-26 기준 관세청 공식 표로 숫자를 대조하지 못해
// 전부 「⚠ 참고치」로 보여 준다(일반적으로 알려진 기본세율, 같은 품목군 안에서도 HS 부호마다 다름).
// 공식 값으로 확인되면 verified를 true로 바꾸고 확인일을 고친다. 관세율 조회 공식 API는 확인하지 못했다.

export interface TariffRow {
  group: string;
  /** 대표 HS 부호(4단위) */
  hs: string;
  /** 일반적으로 알려진 기본세율(%) — 문자열로 범위 표기 가능 */
  basicRate: string;
  note: string;
  verified: boolean;
}

export const TARIFF_CHECKED_AT = "2026-10-26";
export const TARIFF_LOOKUP_URL = "https://unipass.customs.go.kr/clip/index.do";

export const TARIFF_ROWS: TariffRow[] = [
  { group: "의류(니트·직물)", hs: "61·62류", basicRate: "13%", note: "소재·종류와 관계없이 대부분 같은 세율로 알려져 있음", verified: false },
  { group: "신발", hs: "64류", basicRate: "13%", note: "가죽·고무·섬유 등 겉창·갑피 소재에 따라 다를 수 있음", verified: false },
  { group: "가방·지갑", hs: "4202", basicRate: "8%", note: "가죽·합성·섬유 소재 공통으로 알려진 값", verified: false },
  { group: "화장품·향수", hs: "3303·3304", basicRate: "6.5%", note: "기능성 제품은 별도 인증·표시 의무 확인", verified: false },
  { group: "플라스틱 주방·생활용품", hs: "3924", basicRate: "6.5%", note: "식품 닿는 제품은 식품용 기구 검사 필요", verified: false },
  { group: "금속 주방용품(스테인리스 등)", hs: "7323", basicRate: "8%", note: "식품 닿는 제품은 식품용 기구 검사 필요", verified: false },
  { group: "완구", hs: "9503", basicRate: "8%", note: "어린이 제품 KC 인증 확인", verified: false },
  { group: "운동·레저용품", hs: "9506", basicRate: "8%", note: "품목에 따라 다름", verified: false },
  { group: "휴대폰·노트북·주변기기", hs: "8471·8517", basicRate: "0%", note: "정보기술협정(ITA) 품목은 무세로 알려져 있음 — 전파 인증(KC) 확인", verified: false },
  { group: "소형 가전(헤어드라이어·전기주전자 등)", hs: "8509·8516", basicRate: "8%", note: "전기용품 KC 인증 확인", verified: false },
  { group: "반려동물 용품(장난감·하우스 등)", hs: "품목별", basicRate: "품목마다 다름", note: "소재·용도로 분류(사료는 별도 규정·검역)", verified: false },
  { group: "기타 일반 공산품", hs: "—", basicRate: "대부분 8%", note: "우리나라 공산품 기본세율로 흔히 쓰는 값 — 품목별로 꼭 조회", verified: false },
];
