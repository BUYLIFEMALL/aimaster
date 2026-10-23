import { Workspace } from "@/components/Workspace";
import { requireProgramAccess } from "@/lib/access";
import { getRegisteredApiKeys } from "@/lib/apiKeys";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Page() {
  const user = await requireProgramAccess();
  return (
    <Workspace
      userId={user.id}
      initialKeys={await getRegisteredApiKeys(user.id)}
    />
  );
}
