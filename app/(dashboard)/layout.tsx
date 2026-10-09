import Sidebar from "@/components/layout/Sidebar";
import SessionProvider from "@/components/providers/SessionProvider";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = headers().get("x-pathname") ?? "";
  const isContentOps = pathname.startsWith("/threads-content-ops");

  let isAdmin = false;
  if (!isContentOps) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();
        isAdmin = !!profile?.is_admin;
      }
    } catch {
      // ignore
    }
  }

  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        {!isContentOps && <Sidebar initialIsAdmin={isAdmin} />}
        <div className="flex-1 overflow-auto">
          <main className={isContentOps ? "min-h-screen" : "px-4 pt-16 pb-6 md:p-8"}>{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
