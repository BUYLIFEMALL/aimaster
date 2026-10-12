// Isolated component fixture. No Next route, auth bypass, real credential or
// member session is added to the production app by this test entry.
import { createRoot } from "react-dom/client";
import { useWorkspace, WorkspaceProvider } from "../src/components/workspace/WorkspaceProvider";
import { Sidebar } from "../src/components/layout/Sidebar";
import { WorkspacePage, type WorkspaceSection } from "../src/components/workspace/WorkspacePage";
function Fixture() {
  const store = useWorkspace();
  const section = (location.pathname.slice(1) || "editor") as WorkspaceSection;
  return <div className="app-shell"><Sidebar userEmail="fixture@example.test" currentPath={`/${section}`}/><main className="main-workspace"><div className="workspace-banner"><strong>격리된 화면 시험 · 실제 로그인 검수 아님</strong><span role="status">{store.saving ? "저장 중" : store.error ? "저장 실패" : store.dirty ? "저장 대기" : "저장 완료"}</span></div><div className="workspace-content">{store.error && <div role="alert" className="notice warning">{store.error}<div className="actions"><button onClick={() => store.save().catch(() => {})}>저장 다시 시도</button><button onClick={store.downloadDraft}>현재 원고 내려받기</button><button onClick={() => store.reloadDraft().catch(() => {})}>최신 문서 불러오기</button></div></div>}{store.loaded ? <WorkspacePage section={section}/> : <p>시험용 보관함 로딩</p>}</div></main></div>;
}
const member = document.cookie.split("; ").find(v => v.startsWith("fixture-member="))?.split("=")[1] || "fixture-a";
createRoot(document.getElementById("root")!).render(<WorkspaceProvider userId={member}><Fixture/></WorkspaceProvider>);
