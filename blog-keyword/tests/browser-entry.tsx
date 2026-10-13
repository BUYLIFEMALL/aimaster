// 시험 전용 진입점: 실제 컴포넌트를 로그인 없이 시험 서버에 올린다(운영 코드에는 포함되지 않음).
import { createRoot } from "react-dom/client";
import { Workbench } from "../src/components/kw/Workbench";
import { HistoryList } from "../src/components/kw/HistoryList";
import { KeyManager } from "../src/components/workspace/KeyManager";

const q = new URLSearchParams(location.search);
const root = createRoot(document.getElementById("root")!);
const view = q.get("view");
if (view === "history") root.render(<HistoryList />);
else if (view === "keys") root.render(<KeyManager guides={{ gemini: "https://example.com/g", naver: "https://example.com/n", ads: null }} />);
else root.render(<Workbench initialReportId={q.get("report") ?? undefined} />);
