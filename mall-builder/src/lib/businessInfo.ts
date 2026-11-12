// 쇼핑몰 정보(사업자 표시) — mall_builder_stores.business_info(jsonb)에 저장한다.
// 전자상거래법 표시 항목: 상호·대표자·사업자등록번호·통신판매업 신고번호·주소·연락처·개인정보보호책임자

export type BusinessInfo = {
  company_name: string;
  ceo_name: string;
  business_no: string; // 000-00-00000
  mail_order_no: string; // 통신판매업 신고번호
  address: string;
  phone: string;
  email: string;
  privacy_officer: string;
  cs_hours: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
};

export const BUSINESS_FIELDS: { key: keyof BusinessInfo; label: string; required: boolean; max: number; placeholder: string }[] = [
  { key: "company_name", label: "상호", required: true, max: 60, placeholder: "예: 바이라이프" },
  { key: "ceo_name", label: "대표자", required: true, max: 30, placeholder: "예: 홍길동" },
  { key: "business_no", label: "사업자등록번호", required: true, max: 12, placeholder: "000-00-00000" },
  { key: "mail_order_no", label: "통신판매업 신고번호", required: false, max: 40, placeholder: "예: 제2026-서울강남-0000호" },
  { key: "address", label: "사업장 주소", required: true, max: 120, placeholder: "예: 서울시 강남구 …" },
  { key: "phone", label: "고객센터 전화", required: true, max: 20, placeholder: "예: 1644-0000" },
  { key: "email", label: "이메일", required: false, max: 80, placeholder: "예: help@example.com" },
  { key: "privacy_officer", label: "개인정보보호책임자", required: true, max: 60, placeholder: "예: 홍길동 (help@example.com)" },
  { key: "cs_hours", label: "고객센터 운영 시간", required: false, max: 60, placeholder: "예: 평일 10:00~17:00" },
  { key: "bank_name", label: "입금 은행", required: false, max: 20, placeholder: "예: 국민은행" },
  { key: "bank_account", label: "계좌번호", required: false, max: 30, placeholder: "예: 000000-00-000000" },
  { key: "bank_holder", label: "예금주", required: false, max: 30, placeholder: "예: 홍길동(바이라이프)" },
];

export function emptyBusinessInfo(): BusinessInfo {
  return Object.fromEntries(BUSINESS_FIELDS.map((f) => [f.key, ""])) as BusinessInfo;
}

/** DB의 jsonb(모양이 다르거나 비어 있을 수 있음)를 안전하게 읽는다 */
export function readBusinessInfo(raw: unknown): BusinessInfo {
  const base = emptyBusinessInfo();
  if (!raw || typeof raw !== "object") return base;
  for (const f of BUSINESS_FIELDS) {
    const v = (raw as Record<string, unknown>)[f.key];
    if (typeof v === "string") base[f.key] = v;
  }
  return base;
}

/** 사업자등록번호 숫자 10자리를 000-00-00000 모양으로 */
export function formatBusinessNo(input: string): string {
  const d = input.replace(/\D/g, "");
  if (d.length !== 10) return input.trim();
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/** 국세청 사업자등록번호 검증 숫자(마지막 자리) 계산 */
export function isValidBusinessNo(input: string): boolean {
  const d = input.replace(/\D/g, "");
  if (d.length !== 10) return false;
  const n = [...d].map(Number);
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += n[i] * w[i];
  sum += Math.floor((n[8] * 5) / 10);
  return (10 - (sum % 10)) % 10 === n[9];
}

export type BusinessInfoResult = { ok: true; value: BusinessInfo } | { ok: false; errors: Partial<Record<keyof BusinessInfo, string>> };

const DASH_FIELDS = new Set<string>(["business_no", "mail_order_no", "phone", "bank_account"]);

/** 입력값 정리·검사. 필수 칸은 비워 두고 저장할 수 있게 하되(작성 중), 채운 칸은 형식을 검사한다 */
export function validateBusinessInfo(input: Record<string, unknown>): BusinessInfoResult {
  const value = emptyBusinessInfo();
  const errors: Partial<Record<keyof BusinessInfo, string>> = {};
  for (const f of BUSINESS_FIELDS) {
    let v = typeof input[f.key] === "string" ? (input[f.key] as string).trim() : "";
    // 번호 칸: 복사해 온 비슷한 하이픈(‐ ‑ ‒ – — － ー 등)을 일반 하이픈으로(2026-11-12 계좌번호 저장이 막힌 일)
    if (DASH_FIELDS.has(f.key)) v = v.replace(/[‐-―−﹘﹣－ー]/g, "-");
    if (v.length > f.max) errors[f.key] = `${f.label}은(는) ${f.max}자 이내로 입력해 주세요.`;
    value[f.key] = v;
  }
  if (value.business_no) {
    if (!isValidBusinessNo(value.business_no)) errors.business_no = "사업자등록번호 10자리를 다시 확인해 주세요(검증 숫자가 맞지 않습니다).";
    else value.business_no = formatBusinessNo(value.business_no);
  }
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) errors.email = "이메일 형식을 확인해 주세요.";
  if (value.phone && !/^[0-9+()\-\s]{7,20}$/.test(value.phone)) errors.phone = "전화번호는 숫자와 하이픈으로 입력해 주세요.";
  if (value.bank_account && !/^[0-9\-\s]{6,30}$/.test(value.bank_account)) errors.bank_account = "계좌번호는 숫자와 하이픈으로 입력해 주세요.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

/** 손님 화면 바닥글에 꼭 있어야 하는 칸 중 비어 있는 것 */
export function missingRequired(info: BusinessInfo): string[] {
  return BUSINESS_FIELDS.filter((f) => f.required && !info[f.key]).map((f) => f.label);
}
