import { requireProgramAccess } from "@/lib/access";
import { DetailPageApp } from "@/components/DetailPageApp";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HomePage() {
  const user = await requireProgramAccess();

  return <DetailPageApp userEmail={user?.email} />;
}
