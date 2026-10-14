import { requireProgramAccess } from "@/lib/access";
import { History } from "@/components/History";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Page() { const user = await requireProgramAccess(); return <History userId={user.id}/>; }
