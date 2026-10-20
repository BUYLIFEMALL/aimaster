import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProgramNoticeBanner } from "@/components/ProgramNoticeBanner";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-4">
          <ProgramNoticeBanner programSlug="kakao-auto-posting" tone="light" />
        </div>
        {children}
      </main>
    </div>
  );
}
