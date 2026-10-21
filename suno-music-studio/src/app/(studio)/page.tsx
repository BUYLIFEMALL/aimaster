import { requireUser } from "@/lib/auth";
import { MovedNotice } from "@/components/MovedNotice";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Page() {
  const user = await requireUser();
  return <MovedNotice userId={user.id} />;
}
