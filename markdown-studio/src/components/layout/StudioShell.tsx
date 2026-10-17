"use client";
import { usePathname } from "next/navigation";
import { WorkspaceProvider, useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { DriveProvider } from "@/components/workspace/DriveProvider";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
function ShellContents({ email, children }: { email?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const store = useWorkspace();
  return <div className="app-shell"><Sidebar userEmail={email} currentPath={pathname}/><main className="main-workspace"><div className="workspace-banner"><span>문서 작업실</span><span className="banner-right"><span className={store.error ? "error" : "muted"} aria-live="polite">{!store.loaded ? "보관함 여는 중" : store.saving ? "저장 중…" : store.error ? "저장 상태 확인 필요" : store.dirty ? "저장 대기" : "이 기기에 저장됨"}</span><ThemeToggle /></span></div><div className="workspace-content">{store.error && <div className="notice warning" role="alert"><p>{store.error}</p><div className="actions"><button onClick={() => store.save().catch(() => {})}>저장 다시 시도</button><button onClick={store.downloadDraft}>현재 원고 내려받기</button><button onClick={() => { if (!store.dirty || window.confirm("현재 원고를 내려받았습니까? 저장되지 않은 수정 내용을 버리고 최신 문서를 불러옵니다.")) void store.reloadDraft().catch(() => {}); }}>최신 문서 불러오기</button></div></div>}{store.loaded ? children : <div className="card"><p>문서 보관함을 준비하고 있습니다.</p><button onClick={() => window.location.reload()}>다시 불러오기</button></div>}</div></main></div>;
}
export function StudioShell({ userId, email, children }: { userId: string; email?: string; children: React.ReactNode }) {
  return <WorkspaceProvider key={userId} userId={userId}><DriveProvider><ShellContents email={email}>{children}</ShellContents></DriveProvider></WorkspaceProvider>;
}
