import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";
import { ShopFlowBar } from "@/components/ShopFlowBar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="min-w-0 flex-1 p-4 md:p-8">
        {/* E9: 쇼핑몰 흐름으로 들어왔을 때만 보이는 띠 */}
        <ShopFlowBar current="sourcing" />
        {children}
      </main>
    </div>
  );
}
