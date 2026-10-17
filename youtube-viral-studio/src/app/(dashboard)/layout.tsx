import { requireProgramAccess } from "@/lib/access";
import { FavoritesNotice, FavoritesProvider } from "@/components/favorites/FavoritesProvider";
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
      <FavoritesProvider key={user.id} userId={user.id}><main className="flex-1 min-w-0 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          <FavoritesNotice />
          {children}
        </div>
      </main></FavoritesProvider>
    </div>
  );
}
