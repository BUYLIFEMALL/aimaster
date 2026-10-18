// 시험 전용 진입점: 실제 검사 진행(TestRunner)·결과(ResultView) 컴포넌트를 로그인 없이 시험 서버에 올린다(운영 코드에는 포함되지 않음).
// ?view=runner&test=<id> | ?view=result&test=<id>
import { createRoot } from "react-dom/client";
import { TestRunner } from "../src/components/tests/TestRunner";
import { ResultView } from "../src/components/tests/ResultView";
import { ALL_TESTS, getTest, isSensitive } from "../src/lib/tests/registry";
import { scoreTest } from "../src/lib/tests/scoring";

declare global {
  interface Window {
    __score: (testId: string, answers: number[]) => unknown;
    __tests: { id: string; total: number; sensitive: boolean }[];
  }
}
window.__score = (testId, answers) => scoreTest(getTest(testId)!, answers);
window.__tests = ALL_TESTS.map((t) => ({ id: t.id, total: t.questions.length, sensitive: isSensitive(t.id) }));

const q = new URLSearchParams(location.search);
const test = getTest(q.get("test") ?? "") ?? ALL_TESTS[0];
const root = createRoot(document.getElementById("root")!);
if (q.get("view") === "result") {
  const result = scoreTest(test, test.questions.map((_, i) => (i % 5) + 1));
  root.render(<ResultView id="r-test" testId={test.id} result={result} createdAt="2026-10-19T00:00:00Z" previous={null} />);
} else {
  root.render(<TestRunner test={test} />);
}
