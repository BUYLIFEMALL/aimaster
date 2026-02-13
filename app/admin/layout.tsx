import AdminSidebar from "@/components/layout/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <main className="px-4 pt-16 pb-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
