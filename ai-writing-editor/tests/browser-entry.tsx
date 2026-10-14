// 시험 전용 진입점: 실제 컴포넌트를 로그인 없이 시험 서버에 올린다(운영 코드에는 포함되지 않음).
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { StartPanel } from "../src/components/editor/StartPanel";
import { Editor } from "../src/components/editor/Editor";
import { DocumentList } from "../src/components/editor/DocumentList";
import { KeyManager } from "../src/components/workspace/KeyManager";

function EditorLoader({ id, analyze }: { id: string; analyze: boolean }) {
  const [doc, setDoc] = useState<{ id: string; title: string; content: string; content_type?: "markdown" | "html"; format: "free"; sources: { uri: string; title: string }[] } | null>(null);
  useEffect(() => {
    fetch(`/api/documents?id=${id}`).then((r) => r.json()).then((d) => setDoc(d.document));
  }, [id]);
  if (!doc) return <p>불러오는 중…</p>;
  return <Editor id={doc.id} initialTitle={doc.title} initialContent={doc.content} initialContentType={doc.content_type ?? "markdown"} format={doc.format} sources={doc.sources} autoAnalyze={analyze} />;
}

const q = new URLSearchParams(location.search);
const root = createRoot(document.getElementById("root")!);
const view = q.get("view");
if (view === "docs") root.render(<DocumentList />);
else if (view === "keys") root.render(<KeyManager guideUrl="https://example.com/g" />);
else if (location.pathname.startsWith("/editor/")) root.render(<EditorLoader id={location.pathname.split("/")[2]} analyze={q.get("analyze") === "1"} />);
else root.render(<StartPanel />);
