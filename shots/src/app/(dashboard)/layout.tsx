import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#0f0f0f] text-[#f1f1f1]">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 p-4 md:p-8 bg-[#0f0f0f] overflow-x-hidden">{children}</main>
    </div>
  );
}
