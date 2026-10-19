import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";

// 권한 확인 결과가 정적으로 캐시되지 않게 두 줄을 세트로 선언한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col bg-[#0d0f17] text-slate-100 font-sans antialiased md:flex-row dark">
      <Sidebar userEmail={user.email} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
