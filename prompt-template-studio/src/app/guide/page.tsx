import { requireProgramAccess } from "@/lib/access";
import { PromptTemplateApp } from "@/components/PromptTemplateApp";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function GuidePage() {
  const user = await requireProgramAccess();

  return <PromptTemplateApp userEmail={user?.email} initialTab="guide" />;
}
