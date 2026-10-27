import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";
import { ShopFlowBar } from "@/components/ShopFlowBar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-slate-50 text-slate-900">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 min-w-0 bg-slate-50/60 pb-16">
        {/* 이커머스 한 흐름: 쇼핑몰 흐름으로 들어왔을 때만 보이는 띠 */}
        <div className="px-4 pt-4 md:px-8">
          <ShopFlowBar current="detail" />
        </div>
        {children}
      </main>
    </div>
  );
}
