// 화면(브라우저)에서도 쓰는 기본값·이름표 — 다른 파일을 불러오지 않는다(iconv-lite 같은 서버 전용 모듈이 브라우저로 딸려 가지 않게).

export const NO_BRAND = "알수없음"; // 명세: 브랜드가 없으면 「알수없음」
export const DEFAULT_AS = "상품 수령 후 문제가 있으면 판매자에게 문의해 주세요.";
export const DEFAULT_RETURN = "상품 수령 후 7일 이내 반품·교환 신청이 가능합니다. 단순 변심 반품은 왕복 배송비를 구매자가 부담합니다.";
/** 발송마감 템플릿 발송방법(sendClfCd) */
export const SEND_KIND: Record<string, string> = { "01": "일반발송", "02": "오늘발송", "03": "순차발송" };
