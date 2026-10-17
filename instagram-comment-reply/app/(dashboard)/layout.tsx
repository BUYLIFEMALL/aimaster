import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { getPersistedConnectionFlag } from "@/lib/actions/instagram";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const [{ needsReconnect }, { count: pendingCount }] = await Promise.all([
    getPersistedConnectionFlag(supabase, user.id),
    supabase
      .from("ig_comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending_review"),
  ]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar userEmail={user.email ?? ""} pendingCount={pendingCount ?? 0} />
      <main className="min-w-0 flex-1 bg-ig-bg p-4 md:p-8">
        {needsReconnect && (
          <Link
            href="/settings"
            className="mb-4 block rounded-xl border border-ig-warn/40 bg-ig-warn/10 p-3 text-sm font-medium text-ig-warn hover:bg-ig-warn/20"
          >
            ⚠️ 인스타그램 계정 연결이 끊어졌습니다. 눌러서 다시 연결해주세요.
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}
