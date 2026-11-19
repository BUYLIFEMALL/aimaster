// 2026-11-19(msg 주인님 지시) — 「고객이 받는 모양」 안내의 단문·장문 판정을 실제 발송과 맞춘다(화면 계산만, 발송·요금 로직은 그대로).
// sendSms(lib/solapi/client.ts)는 type을 지정하지 않아 SOLAPI가 바이트로 자동 판정한다: 영문·숫자·기호·줄바꿈 1바이트, 한글 등 그 밖의 글자 2바이트, 90바이트 넘으면 장문(LMS).
// 시험 tests/smsBytes.test.mjs.

export const SMS_MAX_BYTES = 90;

/** SOLAPI 기준 바이트 수(ASCII 1, 그 밖 2) */
export function smsBytes(text: string): number {
  let n = 0;
  for (const ch of text) n += (ch.codePointAt(0) ?? 0) <= 0x7f ? 1 : 2;
  return n;
}

/** 90바이트를 넘으면 장문(LMS) */
export const isLongSms = (text: string): boolean => smsBytes(text) > SMS_MAX_BYTES;
