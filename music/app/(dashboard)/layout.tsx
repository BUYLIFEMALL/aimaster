import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#09090b] text-zinc-100 antialiased selection:bg-orange-500 selection:text-white">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 min-w-0 bg-[#09090b] relative">
        {/* Subtle studio neon background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-orange-500/5 blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-purple-600/5 blur-[160px] pointer-events-none -z-10" />
        {children}
      </main>
    </div>
  );
}
