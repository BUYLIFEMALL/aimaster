import { requireProgramAccess } from "@/lib/access";
import { Shell } from "@/components/Shell";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) { const user = await requireProgramAccess(); return <Shell email={user.email || ""}>{children}</Shell>; }
