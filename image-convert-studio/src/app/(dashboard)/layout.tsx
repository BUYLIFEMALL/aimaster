import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";
import { LangProvider } from "@/components/tool/LangProvider";
import { TopBar } from "@/components/layout/TopBar";

// 권한 확인 결과가 정적으로 캐시되지 않게 두 줄을 세트로 선언한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <LangProvider>
      <div className="flex min-h-screen flex-col bg-[#0b0f17] font-sans text-slate-100 antialiased md:flex-row">
        <Sidebar userEmail={user.email} />
        <main className="min-w-0 flex-1 overflow-y-auto bg-[#0b0f17]">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
            <TopBar />
            {children}
          </div>
        </main>
      </div>
    </LangProvider>
  );
}
