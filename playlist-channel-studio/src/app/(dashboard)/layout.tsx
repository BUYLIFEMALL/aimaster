import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProgramNoticeBanner } from "@/components/ProgramNoticeBanner";

// 권한 확인 결과가 정적으로 캐시되지 않게 두 줄을 세트로 선언한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col bg-[#060911] font-sans text-slate-100 antialiased md:flex-row">
      <Sidebar userEmail={user.email} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
          <div className="mb-4">
            <ProgramNoticeBanner programSlug="playlist-channel-studio" tone="dark" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
