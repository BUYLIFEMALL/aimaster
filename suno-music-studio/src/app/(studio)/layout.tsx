import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/Sidebar";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireProgramAccess();
  return (
    <div className="app-shell">
      <Sidebar email={user.email || ""} />
      <main className="app-main">{children}</main>
    </div>
  );
}
