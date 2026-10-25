import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";
import { DataProvider } from "@/components/DataProvider";
import { ShopFlowBar } from "@/components/ShopFlowBar";

// 권한 확인 결과가 정적으로 캐시되지 않게 두 줄을 세트로 선언한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-slate-900 md:flex-row">
      <Sidebar userEmail={user.email} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
          {/* E9: 쇼핑몰 흐름으로 들어왔을 때만 보이는 띠 */}
          <ShopFlowBar current="orders" />
          <DataProvider>{children}</DataProvider>
        </div>
      </main>
    </div>
  );
}
