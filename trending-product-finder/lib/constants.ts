export interface SmtpProviderPreset {
  value: string;
  label: string;
  host: string;
  port: number;
}

// 사용자가 자주 쓰는 이메일 서비스는 호스트/포트를 자동으로 채워준다. "기타"를 고르면 직접
// 입력. booking-reminder/stepmail과 동일한 프리셋(검증된 값)을 재사용한다.
export const SMTP_PROVIDER_PRESETS: SmtpProviderPreset[] = [
  { value: "gmail", label: "Google (Gmail)", host: "smtp.gmail.com", port: 587 },
  { value: "naver", label: "네이버 메일", host: "smtp.naver.com", port: 465 },
  { value: "daum", label: "다음(카카오) 메일", host: "smtp.daum.net", port: 465 },
  { value: "other", label: "기타 (직접 입력)", host: "", port: 587 },
];

export type AlertChannel = "email" | "kakao" | "telegram" | "sms";

// 예약 소싱 알림(Phase 12)에서 회원이 채널별로 켜고 끌 수 있는 발송 채널 목록.
export const ALERT_CHANNEL_OPTIONS: { value: AlertChannel; label: string }[] = [
  { value: "email", label: "📧 이메일" },
  { value: "kakao", label: "💬 카카오톡" },
  { value: "telegram", label: "📨 텔레그램" },
  { value: "sms", label: "💌 문자(SMS)" },
];
