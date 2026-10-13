import { requireProgramAccess } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { ShowcaseDashboard } from "@/components/showcase/ShowcaseDashboard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HomePage() {
  const user = await requireProgramAccess();
  const apiKey = user?.id ? await getUserGeminiApiKey(user.id) : null;

  return (
    <ShowcaseDashboard
      userEmail={user?.email || "buylifemall@naver.com"}
      hasApiKey={!!apiKey}
    />
  );
}
