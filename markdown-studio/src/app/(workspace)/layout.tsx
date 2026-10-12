import { requireProgramAccess } from "@/lib/access";
import { StudioShell } from "@/components/layout/StudioShell";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();
  return <StudioShell userId={user.id} email={user.email}>{children}</StudioShell>;
}
