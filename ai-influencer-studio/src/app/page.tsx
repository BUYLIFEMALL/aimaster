import { requireProgramAccess } from "@/lib/access";
import { InfluencerStudio } from "@/components/InfluencerStudio";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireProgramAccess();

  return <InfluencerStudio userEmail={user?.email} />;
}
