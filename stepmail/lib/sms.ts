// 2026-10-23 v1.27 문자(SMS·LMS) 차수 발송 — 순수 함수(서버·화면·시험에서 함께 씀).

/** 「(광고)」 머리말·수신거부 안내는 정보통신망법 제50조에 따라 영리 목적 문자에 반드시 들어가야 해 발송 때 자동으로 붙인다. */
export const AD_PREFIX = "(광고)";

/** 엑셀·입력값의 핸드폰 번호를 010-1234-5678 형식으로. 핸드폰(010·011·016·017·018·019)이 아니면 null. */
export function normalizeMobile(value: unknown): string | null {
  if (value == null) return null;
  let digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("82")) digits = "0" + digits.slice(2);
  if (digits.length === 10 && digits.startsWith("1")) digits = "0" + digits; // 엑셀이 앞의 0을 지운 경우
  if (!/^01[016789]\d{7,8}$/.test(digits)) return null;
  return digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** 실제로 나갈 문자 전문: (광고) + 본문({닉네임} 치환) + 줄바꿈 + 수신거부 안내. */
export function buildSmsText(body: string, optout: string, nickname: string | null): string {
  const text = body.trim().replaceAll("{닉네임}", nickname?.trim() || "고객");
  return `${AD_PREFIX} ${text}\n${optout.trim()}`;
}

/** 통신사 기준(한글 2바이트·영문 1바이트) 길이. 90바이트를 넘으면 장문(LMS)으로 나간다. */
export function smsBytes(text: string): number {
  let bytes = 0;
  for (const ch of text) bytes += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  return bytes;
}

export const SMS_MAX_BYTES = 90;
export const LMS_MAX_BYTES = 2000;
