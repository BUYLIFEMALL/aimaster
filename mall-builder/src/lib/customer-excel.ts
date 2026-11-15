// M2-8(2026-11-15) 운영사 유저 엑셀 — 칸 머리글·한 줄 만들기(순수 함수, exceljs 없음 → 단위 시험)
// 개인정보가 담긴 파일이라 「유저 관리」 권한이 있는 운영사만 내려받고, 내려받을 때마다 열람 기록을 남긴다.
import { kstStamp } from "./order-excel.ts";

export const CUSTOMER_EXPORT_MAX = 5000;
export const CUSTOMER_SHEET = "유저";

export const CUSTOMER_EXPORT_HEADERS = [
  "이름", "휴대폰", "회원 구분", "등급", "상호", "사업자번호", "대표자", "입장 상태", "외상 한도", "생일", "마케팅 동의", "가입일시",
] as const;

export type ExportCustomer = {
  name: string;
  phone: string;
  approval_status: string;
  member_status: string;
  company: string | null;
  business_no: string | null;
  ceo_name: string | null;
  credit_limit: number | null;
  birth_md: string | null;
  marketing_agree: boolean;
  created_at: string;
  grade: { name: string } | null;
};

/** 유저 한 명 → 엑셀 한 줄(글자) */
export function customerExportRow(c: ExportCustomer, approvalLabel: Record<string, string>, memberLabel: Record<string, string>): string[] {
  return [
    c.name,
    c.phone,
    approvalLabel[c.approval_status] ?? c.approval_status,
    c.grade?.name ?? "",
    c.company ?? "",
    c.business_no ?? "",
    c.ceo_name ?? "",
    memberLabel[c.member_status] ?? c.member_status,
    c.credit_limit ? String(c.credit_limit) : "",
    c.birth_md ?? "",
    c.marketing_agree ? "동의" : "",
    kstStamp(c.created_at),
  ];
}
