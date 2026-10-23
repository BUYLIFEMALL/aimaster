import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MovedNotice } from "@/components/MovedNotice";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.10(2026-10-21, 이커머스 병합 E1): 이동 안내만 남긴다. 프로그램을 카탈로그에서 숨겨도(is_active=false)
// 회원이 브라우저에 남은 12단 자료를 내려받을 수 있도록 로그인만 확인한다(생성 기능은 없음).
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return <MovedNotice userEmail={user.email} />;
}
