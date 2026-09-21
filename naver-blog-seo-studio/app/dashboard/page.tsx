import StudioPage from "@/components/StudioPage";
import { requireProgramAccess } from "@/lib/access";

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  return <StudioPage email={user.email ?? ""} />;
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
