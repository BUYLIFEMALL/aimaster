import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { checkProgramAccess } from "./programAccess";
import { APP_SLUG } from "./version";

export const THIS_PROGRAM_SLUG = APP_SLUG;

export async function requireProgramAccess() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const hasAccess = await checkProgramAccess(user.id, THIS_PROGRAM_SLUG);
  if (!hasAccess) {
    // FREE 배지 또는 접근 권한 체크 실패 시
    // 관리자(buylifemall@gmail.com)는 항상 허용
    if (user.email === "buylifemall@gmail.com") {
      return user;
    }
    redirect("https://www.buylife.xyz/programs");
  }

  return user;
}

export async function checkProgramAccessApi() {
  const user = await getCurrentUser();
  if (!user) {
    return { allowed: false, status: 401, error: "로그인이 필요합니다." };
  }

  const hasAccess = await checkProgramAccess(user.id, THIS_PROGRAM_SLUG);
  if (!hasAccess && user.email !== "buylifemall@gmail.com") {
    return { allowed: false, status: 403, error: "이용 권한이 없습니다." };
  }

  return { allowed: true, user };
}
