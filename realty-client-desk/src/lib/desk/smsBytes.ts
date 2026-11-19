// 2026-11-19(주인님 지시) — 「고객이 받는 모양」 안내의 단문·장문 판정을 실제 발송과 맞춘다(화면 계산만, 발송·요금 로직은 그대로).
// sendSms(lib/solapi/client.ts)는 type을 지정하지 않아 SOLAPI가 바이트로 자동 판정한다: 영문·숫자·기호·줄바꿈 1바이트, 한글 등 그 밖의 글자 2바이트, 90바이트 넘으면 장문(LMS).
// 보완(Master msg_f529c65ef361): ① 미리보기의 수신거부 자리표시는 실제 토큰 길이(16자)로 바꿔 센다 ② 문자 회사 기준(EUC-KR 계열)으로 확실히 셀 수 없는 글자(이모지 등)가 있으면 exact=false로 「추정」을 드러낸다.
// 시험 tests/smsBytes.test.mjs.

export const SMS_MAX_BYTES = 90;

/** 미리보기 맺음말의 수신거부 주소 자리(page.tsx가 넣음) */
export const OPTOUT_PLACEHOLDER = "(고객마다 다름)";
/** 실제 수신거부 토큰 길이 — listings.ts randomBytes(12).toString("base64url") = 영문·숫자 16자 */
export const OPTOUT_TOKEN_LEN = 16;

/** SOLAPI 기준 바이트 수(ASCII 1, 그 밖 2) */
export function smsBytes(text: string): number {
  let n = 0;
  for (const ch of text) n += (ch.codePointAt(0) ?? 0) <= 0x7f ? 1 : 2;
  return n;
}

// 2바이트로 확실히 세는 글자: 한글 음절·자모와 부동산 문자에 흔한 기호(모두 완성형 한글 코드표에 있음)
const SURE_SYMBOLS = new Set([..."·…※★☆○●◎◇◆□■△▲▽▼▶◀→←↑↓「」『』【】〈〉《》‘’“”×÷°℃₩㎡㎥～"]);
function isSure(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return cp <= 0x7f || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0x3131 && cp <= 0x318e) || SURE_SYMBOLS.has(ch);
}

/** 화면 안내용 추정: 자리표시를 실제 토큰 길이로 바꿔 세고, 확실히 셀 수 없는 글자가 있으면 exact=false */
export function smsEstimate(preview: string): { bytes: number; exact: boolean; long: boolean } {
  const text = preview.split(OPTOUT_PLACEHOLDER).join("x".repeat(OPTOUT_TOKEN_LEN));
  const bytes = smsBytes(text);
  const exact = [...text].every(isSure);
  return { bytes, exact, long: bytes > SMS_MAX_BYTES };
}

/** 90바이트를 넘으면 장문(LMS) */
export const isLongSms = (text: string): boolean => smsBytes(text) > SMS_MAX_BYTES;
