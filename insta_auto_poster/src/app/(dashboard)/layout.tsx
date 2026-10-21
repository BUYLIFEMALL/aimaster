import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProgramNoticeBanner } from "@/components/ProgramNoticeBanner";
import { IS_STANDALONE } from "@/lib/deployment";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#0d0f17] text-slate-100">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 min-w-0">
        {/* AIMaster 메인 사이트 공지(공용 DB notices) — 배포판(독립 모드)에는 그 표·사이트가 없어 그리지 않는다(2026-10-22) */}
        {!IS_STANDALONE && (
          <div className="mb-4">
            <ProgramNoticeBanner programSlug="auto-instagram-posting" tone="dark" />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
