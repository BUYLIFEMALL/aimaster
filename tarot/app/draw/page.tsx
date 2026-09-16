import { requireProgramAccess } from "@/lib/access";
import { DrawFlow } from "@/components/DrawFlow";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DrawPage() {
  await requireProgramAccess();
  return <DrawFlow />;
}
