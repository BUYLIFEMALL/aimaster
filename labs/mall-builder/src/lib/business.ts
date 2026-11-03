// 사업자 회원 신청·승인 — DB: mall_builder_store_customers(사업자 칸), mall_builder_customer_grades
// 승인 상태·등급은 손님이 직접 못 바꾸고, DB 함수(신청·심사)만 바꾼다(0010_business.sql)
import { formatBusinessNo, isValidBusinessNo } from "./businessInfo.ts";

export type ApprovalStatus = "none" | "pending" | "approved" | "rejected";

export const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  none: "일반 회원",
  pending: "사업자 승인 대기",
  approved: "사업자 회원",
  rejected: "사업자 신청 반려",
};

export type BusinessApplication = { business_no: string; company: string; ceo_name: string };

export function validateBusinessApplication(
  input: Record<string, unknown>,
): { ok: true; value: BusinessApplication } | { ok: false; error: string } {
  const s = (k: string) => String(input[k] ?? "").trim();
  const no = s("business_no");
  if (!isValidBusinessNo(no)) return { ok: false, error: "사업자등록번호를 확인해 주세요(10자리, 000-00-00000)." };
  const company = s("company");
  if (company.length < 1 || company.length > 60) return { ok: false, error: "상호를 1~60자로 입력해 주세요." };
  const ceo = s("ceo_name");
  if (ceo.length < 1 || ceo.length > 30) return { ok: false, error: "대표자 이름을 1~30자로 입력해 주세요." };
  return { ok: true, value: { business_no: formatBusinessNo(no), company, ceo_name: ceo } };
}

export const CERT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const CERT_MAX_BYTES = 5 * 1024 * 1024;

/** 사업자등록증 파일 검사 — PDF·JPG·PNG·WEBP, 5MB 이하 */
export function checkCertFile(file: { type: string; size: number } | null): string | null {
  if (!file || file.size === 0) return "사업자등록증 파일을 올려 주세요.";
  if (!CERT_TYPES.includes(file.type)) return "사업자등록증은 PDF·JPG·PNG·WEBP 파일만 올릴 수 있습니다.";
  if (file.size > CERT_MAX_BYTES) return "사업자등록증 파일은 5MB 이하만 올릴 수 있습니다.";
  return null;
}

/** 비공개 버킷 저장 경로 — 첫 칸 몰, 둘째 칸 손님 계정(보안 규칙이 이 두 칸으로 판단) */
export function certPath(storeId: string, userId: string, fileType: string, now = Date.now()): string {
  const ext = fileType === "application/pdf" ? "pdf" : fileType.split("/")[1] === "jpeg" ? "jpg" : fileType.split("/")[1];
  return `${storeId}/${userId}/business-cert-${now}.${ext}`;
}
