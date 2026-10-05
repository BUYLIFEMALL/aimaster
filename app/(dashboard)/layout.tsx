import Sidebar from "@/components/layout/Sidebar";
import SessionProvider from "@/components/providers/SessionProvider";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = headers().get("x-pathname") ?? "";
  const isContentOps = pathname.startsWith("/threads-content-ops");
  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        {!isContentOps && <Sidebar />}
        <div className="flex-1 overflow-auto">
          <main className={isContentOps ? "min-h-screen" : "px-4 pt-16 pb-6 md:p-8"}>{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
