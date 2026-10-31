// 개인 정보 지우기 — 엑셀·텔레그램으로 보내기 전에 쓴다(개선 L-1, 0단계 발견).
// 네이버 목록의 중개사 상호(realtorName)에 「…중개사사무소031)917-1234」처럼 전화번호가 섞여 오는 경우가 있다.
// 3단계 수집 엔진(background)이 이 모듈을 가져다 쓴다. 웹 시험: tests/privacy.test.ts

// 지역번호·휴대폰(0으로 시작, 9~11자리) — 괄호·하이픈·점·공백 구분 모두
const AREA_OR_MOBILE = /\(?0\d{1,2}\)?[\s.\-)]*\d{3,4}[\s.\-]*\d{4}/g;
// 대표번호(1588-1234 등)
const REPRESENTATIVE = /(?<!\d)1[5-9]\d{2}[\s.\-]*\d{4}(?!\d)/g;

/** 글자 안의 전화번호 모양을 지우고, 남은 구분 기호·공백을 정리한다. */
export function stripPhoneNumbers(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(AREA_OR_MOBILE, " ")
    .replace(REPRESENTATIVE, " ")
    .replace(/[\s()\-.,/·]+$/g, "")
    .replace(/^[\s()\-.,/·]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
