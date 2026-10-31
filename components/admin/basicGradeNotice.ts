import type { MemberGrade } from "@/types/database.types";

/**
 * 일반 등급은 등급 전환일 기준(0051)이라, 일괄 적용이나 새 체크를 하면 권한이 없는 기존 일반 회원에게
 * 오늘부터 유효한 권한이 생긴다(2026-10-31 주인님 지시: 누르기 전에 팝업으로 알림).
 */
export function confirmBasicGradeGrant(grade: Pick<MemberGrade, "slug" | "default_access_days">, what: string) {
  if (grade.slug !== "basic") return true;
  const period = grade.default_access_days ? `오늘부터 ${grade.default_access_days}일` : "무기한";
  return confirm(`⚠️ 일반 등급 주의\n\n${what}\n\n이 권한이 없는 기존 일반 회원 전원에게 ${period} 사용 권한이 바로 생깁니다.\n\n진행할까요?`);
}
