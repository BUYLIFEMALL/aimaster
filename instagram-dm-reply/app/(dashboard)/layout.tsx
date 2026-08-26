import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { getPersistedConnectionFlag } from "@/lib/actions/instagram";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { needsReconnect } = await getPersistedConnectionFlag(supabase, user.id);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 p-4 md:p-8">
        {needsReconnect && (
          <Link
            href="/settings"
            className="mb-4 block rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            ⚠️ 인스타그램 계정 연결이 끊어졌습니다. 눌러서 다시 연결해주세요.
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}
