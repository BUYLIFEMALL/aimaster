// M1-0(0070) 공급사 입점 신청 — 화면·시험용 순수 함수. DB 함수가 같은 규칙을 다시 검사한다
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

export type SupplierApplyStatus = "pending" | "approved" | "rejected" | "cancelled";
export const SUPPLIER_APPLY_STATUS_LABEL: Record<SupplierApplyStatus, string> = {
  pending: "승인 대기",
  approved: "입점 승인",
  rejected: "반려",
  cancelled: "신청 취소",
};

export type SupplierApplication = {
  id: string;
  store_id: string;
  user_id: string;
  email: string;
  company: string;
  biz_no: string;
  ceo_name: string;
  contact_name: string;
  phone: string;
  category: string;
  intro: string;
  cert_path: string | null;
  status: SupplierApplyStatus;
  note: string;
  supplier_id: string | null;
  created_at: string;
  decided_at: string | null;
};
export const SUPPLIER_APPLY_COLUMNS = "id, store_id, user_id, email, company, biz_no, ceo_name, contact_name, phone, category, intro, cert_path, status, note, supplier_id, created_at, decided_at";

/** 사업자등록증 저장 경로 — 비공개 저장소 `<몰>/<본인>/supplier-apply-<시각>.<확장자>`(DB 저장소 규칙과 같은 모양) */
export function supplierApplyCertPath(storeId: string, userId: string, fileType: string, now = Date.now()): string {
  const ext = fileType === "application/pdf" ? "pdf" : fileType.split("/")[1] === "jpeg" ? "jpg" : fileType.split("/")[1];
  return `${storeId}/${userId}/supplier-apply-${now}.${ext}`;
}

export type SupplierApplyInput = { company: string; biz_no: string; ceo_name: string; contact_name: string; phone: string; category: string; intro: string };

/** 입력 검사 — 상호 1~60자, 사업자등록번호 숫자 10자리 */
export function validateSupplierApply(input: SupplierApplyInput): { ok: true; value: SupplierApplyInput } | { ok: false; error: string } {
  const company = input.company.trim();
  const biz = input.biz_no.replace(/[^0-9]/g, "");
  if (company.length < 1 || company.length > 60) return { ok: false, error: "회사(상호) 이름을 1~60자로 적어 주세요." };
  if (biz.length !== 10) return { ok: false, error: "사업자등록번호 10자리를 적어 주세요." };
  return {
    ok: true,
    value: {
      company,
      biz_no: biz,
      ceo_name: input.ceo_name.trim().slice(0, 30),
      contact_name: input.contact_name.trim().slice(0, 30),
      phone: input.phone.trim().slice(0, 30),
      category: input.category.trim().slice(0, 60),
      intro: input.intro.trim().slice(0, 1000),
    },
  };
}

/** 몰 설정 modules에서 「입점 신청 받기」 켜짐 여부 */
export function supplierApplyOpen(modules: unknown): boolean {
  return !!modules && typeof modules === "object" && (modules as Record<string, unknown>).supplier_apply === true;
}
