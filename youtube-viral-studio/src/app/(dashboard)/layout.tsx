import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col bg-yt-bg font-sans text-yt-text antialiased md:flex-row">
      <Sidebar userEmail={user.email} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
