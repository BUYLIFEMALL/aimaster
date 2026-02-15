import Sidebar from "@/components/layout/Sidebar";
import SessionProvider from "@/components/providers/SessionProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <main className="px-4 pt-16 pb-6 md:p-8">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
