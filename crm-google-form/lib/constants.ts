export interface SmtpProviderPreset {
  value: string;
  label: string;
  host: string;
  port: number;
}

// 사용자가 자주 쓰는 이메일 서비스는 호스트/포트를 자동으로 채워준다. "기타"를 고르면 직접 입력.
// stepmail과 동일한 프리셋(검증된 값)을 재사용한다.
export const SMTP_PROVIDER_PRESETS: SmtpProviderPreset[] = [
  { value: "gmail", label: "Google (Gmail)", host: "smtp.gmail.com", port: 587 },
  { value: "naver", label: "네이버 메일", host: "smtp.naver.com", port: 465 },
  { value: "other", label: "기타 (직접 입력)", host: "", port: 587 },
];
