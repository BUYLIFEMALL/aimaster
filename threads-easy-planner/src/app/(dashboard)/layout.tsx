import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNavigation } from "@/components/layout/MobileNavigation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-neutral-50/50">
      <Sidebar userEmail={user.email ?? ""} />
      <MobileNavigation />
      <main className="flex-1 min-w-0 w-full max-w-5xl mx-auto p-4 pb-28 md:p-8">
        {children}
      </main>
    </div>
  );
}
