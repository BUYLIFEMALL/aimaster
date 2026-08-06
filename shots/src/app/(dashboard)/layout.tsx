import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
