export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();
  return <div className="flex min-h-screen flex-col bg-canvas md:flex-row"><Sidebar userEmail={user.email ?? ""} /><main className="min-w-0 flex-1">{children}</main></div>;
}
