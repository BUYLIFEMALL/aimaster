// 핸드폰 번호 필수 등록 정책(2026-10-12 주인님 지시) — 공용 규칙.
// 신규 가입은 이름·이메일·핸드폰 3개가 필수이고, 핸드폰 번호가 저장된 회원만 프로그램을 쓸 수 있다.
// 핸드폰 번호(010·011·016·017·018·019)만 유효하며 일반 전화(02, 031 등)는 허용하지 않는다.
// 이 파일의 규칙(isValidPhone/hasRegisteredPhone)이 바뀌면 각 서브프로젝트 access 파일의 같은 정규식도 같이 바꾼다.

/** 로그인·프로그램 진입 때 번호가 없는 회원에게 보여주는 안내 문구(주인님 지정) */
export const PHONE_REQUIRED_MESSAGE = "핸드폰 번호를 입력 후 사용해주세요!";

export function phoneDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/[^0-9]/g, "");
}

/** 핸드폰 번호: 01[016789] + 7~8자리(예: 01012345678 → 010-1234-5678) */
export function isValidPhone(value: string | null | undefined): boolean {
  return /^01[016789]\d{7,8}$/.test(phoneDigits(value));
}

/** 프로필에 사용 가능한 번호가 저장돼 있는지 */
export function hasRegisteredPhone(value: string | null | undefined): boolean {
  return isValidPhone(value);
}
