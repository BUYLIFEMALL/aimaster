import { requireProgramAccess } from "@/lib/access";
import { StudioShell } from "@/components/layout/StudioShell";
import { Toaster } from "@/components/ui/Toast";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();
  return <><script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} /><StudioShell userId={user.id} email={user.email}>{children}<Toaster /></StudioShell></>;
}
