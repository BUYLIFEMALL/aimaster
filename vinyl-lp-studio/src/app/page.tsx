import { requireProgramAccess } from "@/lib/access";
import { VinylStudio } from "@/components/VinylStudio";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HomePage() {
  const user = await requireProgramAccess();

  return <VinylStudio userEmail={user?.email} />;
}
