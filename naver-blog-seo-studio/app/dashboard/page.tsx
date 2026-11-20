import StudioPage from "@/components/StudioPage";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { ExtensionLinkStatus } from "@/lib/extensionLinkStatus";

const PROGRAM_SLUG = "naver-blog-seo-studio";

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  // 2026-11-20 IMPROVEMENTS #9 · P2: 회원 본인 권한으로 이 프로그램의 폐기 안 된 연결 코드만 본다(설정 화면과 같은 조건).
  // 최근 사용 시각은 DB에서 최신 1건만(사용 기록 없는 행은 뒤로), 개수는 같은 조건의 집계로 따로 받는다. 어느 쪽이든 실패면 「불러오지 못함」.
  let extensionLink: ExtensionLinkStatus = { state: "error" };
  try {
    const supabase = await createClient();
    const [latest, total] = await Promise.all([
      supabase.from("personal_access_tokens").select("last_used_at").eq("user_id", user.id).eq("program_slug", PROGRAM_SLUG).is("revoked_at", null)
        .order("last_used_at", { ascending: false, nullsFirst: false }).limit(1),
      supabase.from("personal_access_tokens").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("program_slug", PROGRAM_SLUG).is("revoked_at", null),
    ]);
    if (!latest.error && !total.error && Array.isArray(latest.data) && typeof total.count === "number") {
      const lastUsedAt = latest.data[0]?.last_used_at;
      extensionLink = { state: "ok", tokenCount: total.count, lastUsedAt: typeof lastUsedAt === "string" ? lastUsedAt : null };
    }
  } catch {
    extensionLink = { state: "error" };
  }
  return <StudioPage email={user.email ?? ""} extensionLink={extensionLink} />;
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
