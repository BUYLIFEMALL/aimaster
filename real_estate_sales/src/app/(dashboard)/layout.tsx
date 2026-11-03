import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col bg-dark-gradient md:flex-row">
      {/* B2(2026-11-03): 리포트 「🖨 인쇄·PDF로 저장」 때 메뉴는 빼고 본문만 */}
      <div className="contents print:hidden">
        <Sidebar userEmail={user.email ?? ""} />
      </div>
      <main className="min-w-0 flex-1 p-4 md:p-8 print:p-0">{children}</main>
    </div>
  );
}
