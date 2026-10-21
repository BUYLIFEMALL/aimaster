import { Suspense } from "react";
import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProgramNoticeBanner } from "@/components/ProgramNoticeBanner";
import { loadInbox, loadSourceAccess } from "@/lib/inbox/load";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();
  const access = await loadSourceAccess(user.id);
  const items = await loadInbox(user.id, access);
  const counts: Record<string, number> = { all: items.length };
  for (const it of items) counts[it.platform] = (counts[it.platform] ?? 0) + 1;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Suspense>
        <Sidebar userEmail={user.email ?? ""} counts={counts} />
      </Suspense>
      <main className="min-w-0 flex-1 bg-ig-bg p-4 md:p-8">
        <div className="mb-4">
          <ProgramNoticeBanner programSlug="comment-inbox" tone="dark" />
        </div>
        {children}
      </main>
    </div>
  );
}
