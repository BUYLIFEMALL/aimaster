import { requireProgramAccess } from "@/lib/access";
import { getRegisteredApiKeys } from "@/lib/apiKeys";
import { Workspace } from "@/components/Workspace";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Page() {
  const user = await requireProgramAccess();
  return (
    <Workspace
      key={user.id}
      userId={user.id}
      registered={await getRegisteredApiKeys(user.id)}
    />
  );
}
