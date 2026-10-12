import { requireProgramAccess } from "@/lib/access";
import { PlaylistStudioApp } from "@/components/PlaylistStudioApp";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HomePage() {
  const user = await requireProgramAccess();

  return <PlaylistStudioApp userEmail={user?.email} userId={user?.id} />;
}
