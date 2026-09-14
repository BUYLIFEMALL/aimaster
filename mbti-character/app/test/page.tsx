import { QUICK_QUESTIONS } from "@/lib/questions";
import { TestFlow } from "@/components/TestFlow";
import { requireProgramAccess } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function TestPage() {
  await requireProgramAccess();
  return <TestFlow questions={QUICK_QUESTIONS} />;
}
