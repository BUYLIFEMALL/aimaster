import { requireProgramAccess } from "@/lib/access";
import EraseStudio from "@/components/EraseStudio";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ErasePage() {
  await requireProgramAccess();
  return <EraseStudio />;
}
