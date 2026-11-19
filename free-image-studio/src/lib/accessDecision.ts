// 판정 결과를 「어디로 보낼지 / 어떤 오류로 답할지」로 바꾸는 순수 함수. 서버 전용 모듈에 기대지 않아 시험에서 직접 부른다.
import type { ProgramAccessResult } from "./programAccess";

export const THIS_PROGRAM_SLUG = "free-image-studio";

/**
 * 페이지·레이아웃용 — 통과면 null, 아니면 보낼 주소.
 * 프로그램이 메인 사이트에 등록되지 않았으면(not_found) 관리자 포함 누구도 들어오지 못하고 프로그램 목록으로 보낸다.
 */
export function accessRedirect(access: Pick<ProgramAccessResult, "allowed" | "reason">, mainSiteUrl: string): string | null {
  if (access.reason === "not_found") return `${mainSiteUrl}/programs`;
  if (access.reason === "phone_required") return `${mainSiteUrl}/settings?need_phone=1`;
  if (access.reason === "suspended") return `${mainSiteUrl}/programs/${THIS_PROGRAM_SLUG}?error=suspended`;
  if (!access.allowed) return `${mainSiteUrl}/programs/${THIS_PROGRAM_SLUG}?need_access=1`;
  return null;
}

/** API route용 — 통과면 null, 아니면 JSON으로 돌려줄 오류(redirect 금지). */
export function accessApiError(access: Pick<ProgramAccessResult, "allowed" | "reason">): { error: string; status: number } | null {
  if (access.reason === "not_found") return { error: "아직 열리지 않은 프로그램입니다.", status: 403 };
  if (access.reason === "phone_required") return { error: "핸드폰 번호를 입력 후 사용해주세요!", status: 403 };
  if (access.reason === "suspended") return { error: "정지된 계정입니다.", status: 403 };
  if (!access.allowed) return { error: "이 프로그램의 이용 권한이 없습니다. 메인 사이트에서 이용 권한을 확인해주세요.", status: 403 };
  return null;
}

/** 로그인 뒤 돌아갈 곳 — 「/」로 시작하는 내부 경로만 */
export function safeInternalPath(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "/";
  return path;
}
