import { requireProgramAccess } from "@/lib/access";
import { TopNav } from "@/components/layout/TopNav";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="min-h-screen">
      <TopNav userEmail={user.email ?? ""} />
      <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
