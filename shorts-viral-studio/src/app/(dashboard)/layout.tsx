import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";
import { StudioProvider } from "@/components/studio/StudioProvider";

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
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 p-4 md:p-8">
        <StudioProvider>{children}</StudioProvider>
      </main>
    </div>
  );
}
