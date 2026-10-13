// 시험 전용 진입점: 실제 컴포넌트를 로그인 없이 시험 서버에 올린다(운영 코드에는 포함되지 않음).
import { createRoot } from "react-dom/client";
import { Analyzer } from "../src/components/studio/Analyzer";
import { HistoryList } from "../src/components/workspace/HistoryList";

const q = new URLSearchParams(location.search);
const root = createRoot(document.getElementById("root")!);
if (q.get("view") === "history") root.render(<HistoryList />);
else root.render(<Analyzer historyId={q.get("h") ?? undefined} />);
