import { requireProgramAccess } from "@/lib/access";
import { PromptStudioApp } from "@/components/PromptStudioApp";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HomePage() {
  const user = await requireProgramAccess();

  return <PromptStudioApp userEmail={user?.email} />;
}
