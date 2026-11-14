// M1-4(0071) 리셀러 신청 — 화면·시험용 순수 함수. DB 함수(mall_builder_reseller_apply)가 같은 규칙을 다시 검사한다
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

export type ResellerApplyStatus = "pending" | "approved" | "rejected" | "cancelled";
export const RESELLER_APPLY_STATUS_LABEL: Record<ResellerApplyStatus, string> = {
  pending: "승인 대기",
  approved: "리셀러 승인",
  rejected: "반려",
  cancelled: "신청 취소",
};

export type PayeeType = "individual" | "business";
export const PAYEE_TYPE_LABEL: Record<PayeeType, string> = { individual: "개인(사업소득 3.3% 원천징수)", business: "사업자(세금계산서)" };

export type ResellerApplication = {
  id: string;
  store_id: string;
  user_id: string;
  customer_id: string;
  name: string;
  phone: string;
  channel: string;
  intro: string;
  payee_type: PayeeType;
  biz_no: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  bankbook_path: string;
  doc_path: string | null;
  status: ResellerApplyStatus;
  note: string;
  reseller_id: string | null;
  created_at: string;
  decided_at: string | null;
};
export const RESELLER_APPLY_COLUMNS =
  "id, store_id, user_id, customer_id, name, phone, channel, intro, payee_type, biz_no, bank_name, bank_account, bank_holder, bankbook_path, doc_path, status, note, reseller_id, created_at, decided_at";

export const APPLY_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const APPLY_FILE_MAX = 5 * 1024 * 1024;

/** 서류 파일 검사 — 없으면 null 대신 안내 문구 */
export function checkApplyFile(file: { type: string; size: number } | null, label: string): string | null {
  if (!file || !file.size) return `${label}을(를) 올려 주세요.`;
  if (!APPLY_FILE_TYPES.includes(file.type)) return `${label}은(는) PDF·JPG·PNG·WEBP 파일만 올릴 수 있습니다.`;
  if (file.size > APPLY_FILE_MAX) return `${label}은(는) 5MB 이하로 올려 주세요.`;
  return null;
}

/** 서류 저장 경로 — 비공개 저장소 `<몰>/<본인>/reseller-apply-<종류>-<시각>.<확장자>`(DB 검사와 같은 모양) */
export function resellerApplyPath(storeId: string, userId: string, kind: "bankbook" | "doc", fileType: string, now = Date.now()): string {
  const sub = fileType.split("/")[1] ?? "bin";
  const ext = fileType === "application/pdf" ? "pdf" : sub === "jpeg" ? "jpg" : sub;
  return `${storeId}/${userId}/reseller-apply-${kind}-${now}.${ext}`;
}

export type ResellerApplyInput = {
  name: string;
  phone: string;
  channel: string;
  intro: string;
  payee_type: string;
  biz_no: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
};
export type ResellerApplyValue = Omit<ResellerApplyInput, "payee_type"> & { payee_type: PayeeType };

/** 입력 검사 — 이름·홍보 채널·정산 계좌 필수, 사업자면 사업자등록번호 10자리 */
export function validateResellerApply(input: ResellerApplyInput): { ok: true; value: ResellerApplyValue } | { ok: false; error: string } {
  const name = input.name.trim();
  const channel = input.channel.trim();
  const type = input.payee_type === "business" ? "business" : input.payee_type === "individual" ? "individual" : null;
  const biz = input.biz_no.replace(/[^0-9]/g, "");
  const bankName = input.bank_name.trim();
  const account = input.bank_account.trim();
  const holder = input.bank_holder.trim();
  if (name.length < 1 || name.length > 30) return { ok: false, error: "이름을 1~30자로 적어 주세요." };
  if (channel.length < 1 || channel.length > 300) return { ok: false, error: "홍보할 채널(블로그·인스타 등 주소)을 적어 주세요." };
  if (!type) return { ok: false, error: "개인·사업자 구분을 골라 주세요." };
  if (type === "business" && biz.length !== 10) return { ok: false, error: "사업자등록번호 10자리를 적어 주세요." };
  if (bankName.length < 1 || bankName.length > 30 || account.length < 5 || account.length > 40 || holder.length < 1 || holder.length > 30)
    return { ok: false, error: "정산받을 은행·계좌번호·예금주를 적어 주세요." };
  return {
    ok: true,
    value: {
      name,
      phone: input.phone.trim().slice(0, 30),
      channel,
      intro: input.intro.trim().slice(0, 1000),
      payee_type: type,
      biz_no: type === "business" ? biz : "",
      bank_name: bankName,
      bank_account: account,
      bank_holder: holder,
    },
  };
}

/** 몰 설정 modules에서 「리셀러 신청 받기」 켜짐 여부 */
export function resellerApplyOpen(modules: unknown): boolean {
  return !!modules && typeof modules === "object" && (modules as Record<string, unknown>).reseller_apply === true;
}

/** 승인 때 추가 수수료율 입력 — 비면 null(0%), 0~50 */
export function parseApproveRate(raw: unknown): { ok: true; value: number | null } | { ok: false; error: string } {
  const s = String(raw ?? "").trim();
  if (s === "") return { ok: true, value: null };
  const n = Number(s.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 50) return { ok: false, error: "리셀러 추가 수수료율은 0~50 사이 숫자로 적어 주세요." };
  return { ok: true, value: Math.round(n * 100) / 100 };
}
