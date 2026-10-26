import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#0b0d1b] text-slate-100">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 p-4 md:p-8 bg-[#0b0d1b] overflow-x-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}
