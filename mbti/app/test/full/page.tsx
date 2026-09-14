import { FULL_QUESTIONS } from "@/lib/questions";
import { TestFlow } from "@/components/TestFlow";

export default function FullTestPage() {
  return <TestFlow questions={FULL_QUESTIONS} mode="full" />;
}
