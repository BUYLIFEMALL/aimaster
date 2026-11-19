// 2026-11-19(주인님 지시) — 「고객이 받는 모양」 안내의 단문·장문을 실제 발송과 같은 바이트 기준으로 추정한다(화면 계산만, 발송·요금 로직은 그대로).
// sendSms(lib/solapi/client.ts)는 type을 지정하지 않아 SOLAPI가 바이트로 자동 판정한다: 영문·숫자·기호·줄바꿈 1바이트, 한글 등 그 밖의 글자 2바이트, 90바이트 넘으면 장문(LMS).
// 보완(Master msg_6036ab5dfd3a): 문자열 치환 없이, 미리보기 맺음말에 처음부터 실제와 같은 16자 예시 토큰을 넣고 그대로 센다.
// 공급자 인코딩·최종 문구와 다를 수 있으므로 화면은 항상 「추정」으로만 표시한다. 시험 tests/smsBytes.test.mjs.

export const SMS_MAX_BYTES = 90;

/** 미리보기용 수신거부 예시 토큰 — 실제 토큰(listings.ts randomBytes(12).toString("base64url"))과 같은 영문·숫자 16자 */
export const OPTOUT_SAMPLE_TOKEN = "AbCd1234EfGh5678";

/** SOLAPI 기준 바이트 수 추정(ASCII 1, 그 밖 2) */
export function smsBytes(text: string): number {
  let n = 0;
  for (const ch of text) n += (ch.codePointAt(0) ?? 0) <= 0x7f ? 1 : 2;
  return n;
}

/** 90바이트를 넘으면 장문(LMS)으로 추정 */
export const isLongSms = (text: string): boolean => smsBytes(text) > SMS_MAX_BYTES;
