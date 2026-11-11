// 몰 손님(몰별 가입)·배송지 — DB: mall_builder_store_customers, mall_builder_customer_addresses
// 같은 인증 계정이 몰 A·B에 따로 가입한다(몰마다 한 줄). 사업자·등급은 F12에서 추가.

export type CustomerInput = { name: string; phone: string; marketing_agree: boolean };
export type AddressInput = { label: string; receiver: string; phone: string; zip: string; addr1: string; addr2: string; is_default: boolean };

/** 휴대폰 번호 정리: 01012345678 → 010-1234-5678. 휴대폰(010·011·016·017·018·019)만 허용, 아니면 null */
export function normalizeMobile(input: string): string | null {
  const d = String(input).replace(/\D/g, "");
  const m = d.match(/^(01[016789])(\d{3,4})(\d{4})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function validateCustomer(input: Record<string, unknown>): { ok: true; value: CustomerInput } | { ok: false; error: string } {
  const name = String(input.name ?? "").trim();
  if (name.length < 1 || name.length > 30) return { ok: false, error: "이름은 1~30자로 입력해 주세요." };
  const phone = normalizeMobile(String(input.phone ?? ""));
  if (!phone) return { ok: false, error: "휴대폰 번호를 확인해 주세요(예: 010-1234-5678)." };
  return { ok: true, value: { name, phone, marketing_agree: input.marketing_agree === "on" || input.marketing_agree === true } };
}

export function validateAddress(input: Record<string, unknown>): { ok: true; value: AddressInput } | { ok: false; error: string } {
  const s = (k: string) => String(input[k] ?? "").trim();
  const label = s("label") || "배송지";
  const receiver = s("receiver");
  const zip = s("zip").replace(/\D/g, "");
  const addr1 = s("addr1");
  const addr2 = s("addr2");
  if (label.length > 20) return { ok: false, error: "배송지 이름은 20자 이내로 입력해 주세요." };
  if (receiver.length < 1 || receiver.length > 30) return { ok: false, error: "받는 분 이름을 입력해 주세요." };
  const phone = normalizeMobile(s("phone"));
  if (!phone) return { ok: false, error: "받는 분 휴대폰 번호를 확인해 주세요." };
  if (!/^\d{5}$/.test(zip)) return { ok: false, error: "우편번호 5자리를 입력해 주세요." };
  if (addr1.length < 2 || addr1.length > 120) return { ok: false, error: "주소를 입력해 주세요." };
  if (addr2.length > 120) return { ok: false, error: "상세 주소는 120자 이내로 입력해 주세요." };
  return { ok: true, value: { label, receiver, phone, zip, addr1, addr2, is_default: input.is_default === "on" || input.is_default === true } };
}

/** 이메일을 가려서 보여 주기(운영자 목록용 아님 — 공개 화면용): ab***@example.com */
export function maskEmail(email: string): string {
  const [id, domain] = email.split("@");
  if (!domain) return email;
  return `${id.slice(0, 2)}${"*".repeat(Math.max(1, id.length - 2))}@${domain}`;
}
