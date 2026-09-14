import { QUICK_QUESTIONS } from "@/lib/questions";
import { TestFlow } from "@/components/TestFlow";

export default function TestPage() {
  return <TestFlow questions={QUICK_QUESTIONS} />;
}
