import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen bg-gray-50/60 font-sans text-gray-900 antialiased">
      <Sidebar userEmail={user.email} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
