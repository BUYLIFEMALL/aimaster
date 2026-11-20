import StudioPage from "@/components/StudioPage";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { ExtensionLinkStatus } from "@/lib/extensionLinkStatus";

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  // 2026-11-20 IMPROVEMENTS #9: 확장 연결 상태 — 설정 화면과 같은 회원 본인 조회(이 프로그램·폐기 안 된 연결 코드). 실패해도 화면은 그대로.
  let extensionLink: ExtensionLinkStatus | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("personal_access_tokens").select("last_used_at").eq("user_id", user.id).eq("program_slug", "naver-blog-seo-studio").is("revoked_at", null);
    if (!error && Array.isArray(data)) {
      const used = data.map((row) => row.last_used_at).filter((value): value is string => typeof value === "string").sort();
      extensionLink = { tokenCount: data.length, lastUsedAt: used.length ? used[used.length - 1] : null };
    }
  } catch {
    extensionLink = null;
  }
  return <StudioPage email={user.email ?? ""} extensionLink={extensionLink} />;
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
