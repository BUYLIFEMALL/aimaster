import { FULL_QUESTIONS } from "@/lib/questions";
import { TestFlow } from "@/components/TestFlow";
import { requireProgramAccess } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function FullTestPage() {
  await requireProgramAccess();
  return <TestFlow questions={FULL_QUESTIONS} mode="full" />;
}
