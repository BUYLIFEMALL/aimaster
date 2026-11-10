import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="min-h-screen md:flex">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="min-w-0 flex-1 overflow-x-clip px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
