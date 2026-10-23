import { getCurrentUser } from "@/lib/auth";
import { MovedNotice } from "@/components/MovedNotice";

// 2026-10-21 병합 C(v1.06): 모든 화면은 AI Prompt 「📁 내 템플릿 보관함」으로 옮겨졌다는 안내 + 브라우저 템플릿 옮기기만 보여 준다.
// 프로그램을 숨겨도(is_active=false) 안내가 보이도록 프로그램 권한이 아니라 로그인 여부만 확인한다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function Page() {
  const user = await getCurrentUser();
  return <MovedNotice loggedIn={!!user} />;
}
