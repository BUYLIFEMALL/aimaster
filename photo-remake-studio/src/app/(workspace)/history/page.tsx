import { requireUser } from "@/lib/auth";
import { History } from "@/components/History";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Page() { const user = await requireUser(); return <History userId={user.id}/>; }
