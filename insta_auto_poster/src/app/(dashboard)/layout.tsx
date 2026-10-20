import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProgramNoticeBanner } from "@/components/ProgramNoticeBanner";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#0d0f17] text-slate-100">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 min-w-0">
        <div className="mb-4">
          <ProgramNoticeBanner programSlug="auto-instagram-posting" tone="dark" />
        </div>
        {children}
      </main>
    </div>
  );
}
