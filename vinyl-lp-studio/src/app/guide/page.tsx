import { getUser } from "@/lib/auth";
import { VinylGuideView } from "@/components/VinylGuideView";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function GuidePage() {
  const user = await getUser();

  return (
    <div className="min-h-screen bg-[#0c0d12] flex flex-col font-sans">
      <VinylGuideView />
    </div>
  );
}
