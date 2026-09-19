import { requireProgramAccess } from "@/lib/access";
import ConverterWorkspace from "@/components/ConverterWorkspace";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardPage() {
  await requireProgramAccess();
  return <ConverterWorkspace />;
}
