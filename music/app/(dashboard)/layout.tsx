import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {children}
      </main>
    </div>
  );
}
