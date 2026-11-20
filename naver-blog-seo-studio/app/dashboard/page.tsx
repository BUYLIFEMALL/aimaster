import StudioPage from "@/components/StudioPage";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { extensionLinkFromQuery, type ExtensionLinkStatus } from "@/lib/extensionLinkStatus";

const PROGRAM_SLUG = "naver-blog-seo-studio";

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  // 2026-11-20 IMPROVEMENTS #9 · P2: 회원 본인 권한으로 이 프로그램의 폐기 안 된 연결 코드만 본다(설정 화면과 같은 조건).
  // 2차 P2(Mac msg_a4cae4da3aef): 한 번의 조회만 — 최신 1건(사용 기록 없는 행은 뒤로). 두 응답을 합치지 않는다(사이에 바뀌면 어긋남).
  // 0행 = 코드 없음, 1행 시각 없음 = 사용 기록 없음, 시각 있음 = 과거 기록, 오류 = 불러오지 못함(extensionLinkFromQuery).
  let extensionLink: ExtensionLinkStatus = { state: "error" };
  try {
    const supabase = await createClient();
    const latest = await supabase.from("personal_access_tokens").select("last_used_at").eq("user_id", user.id).eq("program_slug", PROGRAM_SLUG).is("revoked_at", null)
      .order("last_used_at", { ascending: false, nullsFirst: false }).limit(1);
    extensionLink = extensionLinkFromQuery(latest);
  } catch {
    extensionLink = { state: "error" };
  }
  return <StudioPage email={user.email ?? ""} extensionLink={extensionLink} />;
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
