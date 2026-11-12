// 같은 계정 「PC 1곳 + 모바일 1곳」 동시 접속의 기기 종류 판정.
// DB 함수 public.login_device_kind(supabase/migrations/0069_device_slot_login.sql)와 같은 규칙을 지킨다.
// 플랜: docs/PLAN_20261112_DEVICE_SLOT_LOGIN.md
export type DeviceKind = "pc" | "mobile" | "other";

export function deviceKindFromUserAgent(ua: string | null | undefined): DeviceKind {
  // 브라우저가 아니면(서버·데스크톱 앱·스크립트) 제한하지 않는다
  if (!ua || !ua.startsWith("Mozilla/")) return "other";
  return /Mobi|Android|iPhone|iPad/.test(ua) ? "mobile" : "pc";
}
