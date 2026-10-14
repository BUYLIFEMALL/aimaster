import { requireProgramAccess } from "@/lib/access";
import { Studio } from "@/components/Studio";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Page() { const user = await requireProgramAccess(); return <Studio userId={user.id} mode="restore"/>; }
