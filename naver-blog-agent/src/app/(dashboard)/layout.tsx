import { DashboardShell } from "@/components/layout/DashboardShell";
import { requireProgramAccess } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireProgramAccess();

  return (
    <DashboardShell userEmail={user.email || ""}>
      {children}
    </DashboardShell>
  );
}
