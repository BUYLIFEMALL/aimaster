"use client";
import { useState } from "react";
import { Download, FilePlus2, History, Save, FolderOpen } from "lucide-react";
import { type DocumentRevision, safeFilename } from "@/lib/documents/model";
import { DOCUMENT_TEMPLATES } from "@/lib/documents/templates";
import { DocumentExplorer } from "./DocumentExplorer";
import { MarkdownPreview } from "./MarkdownPreview";
import { downloadText, useWorkspace } from "./WorkspaceProvider";

export type WorkspaceSection = "dashboard" | "prepare" | "editor" | "export" | "library";
const TITLES = {
  dashboard: ["문서 작업을 한 곳에서", "새 문서를 준비하고, 편집한 내용을 이 기기에 보관하세요."],
  prepare: ["1. 문서 준비", "빈 문서나 템플릿으로 시작합니다."],
  editor: ["2. 편집·미리보기", "왼쪽에는 마크다운 원문, 오른쪽에는 완성된 서식이 표시됩니다."],
  export: ["3. 변환·내보내기", "현재 문서의 마크다운 원문을 내려받습니다."],
  library: ["4. 문서 보관함", "문서와 폴더를 정리하고 수정 이력을 복원합니다."],
};
export function WorkspacePage({ section }: { section: WorkspaceSection }) {
  const store = useWorkspace();
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("blank");
  const [parentId, setParentId] = useState("");
  const [tab, setTab] = useState("edit");
  const [history, setHistory] = useState<DocumentRevision[]>([]);
  const [historyFor, setHistoryFor] = useState("");
  const [pending, setPending] = useState(false);
  const active = store.nodes.find(n => n.id === store.draft?.id && !n.deletedAt);
  const liveDocs = store.nodes.filter(n => n.kind === "document" && !n.deletedAt);
  const trash = store.nodes.filter(n => n.deletedAt && !store.nodes.some(p => p.id === n.parentId && p.deletedAt && p.trashBatchId === n.trashBatchId));
  async function action(work: () => Promise<unknown>) {
    setPending(true);
    try { await work(); } catch (e) { store.reportError(e); } finally { setPending(false); }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    await action(async () => {
      await store.save();
      const node = await store.run(repo => repo.create("document", name, parentId || null, DOCUMENT_TEMPLATES.find(t => t.id === template)?.markdown || ""));
      await store.select(node.id); window.location.assign("/editor");
    });
  }
  function download() { if (active && store.draft) downloadText(safeFilename(active.name).replace(/\.md$/i, "") + ".md", store.draft.markdown); }
  async function openHistory() {
    if (!active) return;
    await action(async () => { await store.save(); setHistory(await store.run(repo => repo.history(active.id))); setHistoryFor(active.id); });
  }
  const title = TITLES[section];
  return <>
    <div className="page-heading"><p className="eyebrow">MARKDOWN STUDIO</p><h1>{title[0]}</h1><p>{title[1]}</p></div>
    {section === "dashboard" && <><div className="stat-grid"><div className="card"><FilePlus2 size={22}/><strong>{liveDocs.length}</strong><span>저장된 문서</span></div><div className="card"><FolderOpen size={22}/><strong>{store.nodes.filter(n => n.kind === "folder" && !n.deletedAt).length}</strong><span>폴더</span></div><div className="card"><History size={22}/><strong>30</strong><span>문서별 최대 수정 이력</span></div></div><div className="card"><h2>빠르게 시작하기</h2><p>문서는 로그인한 계정별로 이 브라우저에 저장됩니다. 다른 기기에는 자동으로 전달되지 않으며, 중요한 문서는 원문을 내려받아 보관하세요.</p><div className="actions"><a className="button primary" href="/prepare">새 문서 준비</a><a className="button" href="/editor">이어서 편집</a><a className="button" href="/library">보관함 열기</a></div></div><div className="card"><h2>최근 수정한 문서</h2>{liveDocs.slice().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0,6).map(n => <button className="document-list-item" key={n.id} onClick={() => action(async () => { await store.select(n.id); window.location.assign("/editor"); })}><span>{n.name}</span><small>수정 {n.revision}회</small></button>)}{!liveDocs.length && <p className="empty">첫 문서를 만들어 보세요.</p>}</div></>}
    {section === "prepare" && <div className="prepare-grid"><form className="card stack" onSubmit={create}><h2>새 문서 만들기</h2><label>문서 이름<input aria-label="문서 이름" value={name} placeholder="예: 회의록.md" maxLength={120} onChange={e => setName(e.target.value)} required/></label><label>저장 폴더<select aria-label="저장 폴더" value={parentId} onChange={e => setParentId(e.target.value)}><option value="">최상위</option>{store.nodes.filter(n => n.kind === "folder" && !n.deletedAt).map(n => <option value={n.id} key={n.id}>{n.name}</option>)}</select></label><fieldset><legend>시작할 문서</legend><div className="template-grid">{DOCUMENT_TEMPLATES.map(t => <label className={`template-card ${template === t.id ? "chosen" : ""}`} key={t.id}><input type="radio" name="template" value={t.id} checked={template === t.id} onChange={() => setTemplate(t.id)}/><strong>{t.name}</strong><small>{t.description}</small></label>)}</div></fieldset><button className="button primary" disabled={pending}>문서 만들고 편집하기</button></form><div className="card"><h2>문서 관리 안내</h2><p>폴더와 문서는 보관함에서 이름을 바꾸거나 이동할 수 있습니다. 삭제하면 휴지통에 보관되어 다시 복원할 수 있습니다.</p><p className="muted">파일 가져오기와 JSON 백업·복원은 다음 단계에서 추가합니다.</p></div></div>}
    {section === "editor" && <div className={`editor-layout ${store.preferences.explorerOpen ? "" : "without-explorer"}`}>
      {store.preferences.explorerOpen && <DocumentExplorer compact/>}
      <section className="card editor-panel"><div className="panel-heading"><div><h2>{active?.name || "문서를 선택하세요"}</h2><small className="muted">{active ? `${store.draft?.markdown.length.toLocaleString() || 0}자 · 수정 ${active.revision}회` : "탐색기에서 문서를 열거나 새 문서를 만드세요."}</small></div><div className="actions"><button onClick={() => action(() => store.setPreferences({ explorerOpen: !store.preferences.explorerOpen }))}>탐색기 {store.preferences.explorerOpen ? "접기" : "열기"}</button><button disabled={!active || pending} onClick={() => action(store.save)}><Save size={14}/>저장</button><button className="download" disabled={!active} onClick={download}><Download size={14}/>원문 저장</button></div></div>
        {active && store.draft ? <><div className="editor-tabs" role="tablist" aria-label="문서 보기"><button role="tab" aria-selected={tab === "edit"} onClick={() => setTab("edit")}>원문 편집</button><button role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>미리보기</button></div><div className="split-controls"><label>편집 영역 너비<input type="range" min="25" max="75" value={store.preferences.editorPercent} aria-label="편집 영역 너비" onChange={e => { const value = Number(e.target.value); void action(() => store.setPreferences({ editorPercent: value })); }}/></label></div><div className={`editor-split show-${tab}`} style={{ gridTemplateColumns: `${store.preferences.editorPercent}% minmax(0, 1fr)` }}><div className="source-pane"><span className="pane-label">마크다운 원문</span><textarea aria-label="마크다운 원문" spellCheck={false} value={store.draft.markdown} onChange={e => store.edit(e.target.value)} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); void action(store.save); } }}/></div><div className="preview-pane"><span className="pane-label">미리보기</span><MarkdownPreview markdown={store.draft.markdown}/></div></div><p className="muted editor-note">이 기기에 자동 저장합니다. Google Drive 업로드와 고급 서식 도구는 다음 단계에서 연결합니다.</p></> : <div className="empty"><p>새 문서를 작성할 준비가 되었나요?</p><a className="button primary" href="/prepare">문서 준비하기</a></div>}
      </section>
    </div>}
    {section === "export" && <div className="card stack"><h2>현재 문서 내려받기</h2><select aria-label="내려받을 문서" value={active?.id || ""} onChange={e => action(() => store.select(e.target.value))}><option value="" disabled>문서를 선택하세요</option>{liveDocs.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select><p>마크다운 원문을 그대로 저장합니다. 현재 입력 중인 내용도 포함됩니다.</p><div><button className="button download" disabled={!active} onClick={download}><Download size={16}/>마크다운 내려받기 (.md)</button></div><div className="notice"><strong>변환 기능 개발 순서</strong><p>HTML·PDF·Word·폴더 묶음 내보내기는 3단계에서 추가합니다. 아직 제공되지 않는 형식은 완료된 기능으로 표시하지 않습니다.</p></div></div>}
    {section === "library" && <div className="library-grid"><DocumentExplorer/><div className="stack"><section className="card"><div className="panel-heading"><h2>수정 이력</h2><button disabled={!active || pending} onClick={openHistory}>현재 문서 이력 보기</button></div><p className="muted">{active ? active.name : "먼저 왼쪽에서 문서를 선택하세요."} · 최근 30개 이력을 보관합니다.</p>{historyFor === active?.id && history.map(r => <div key={r.key} className="history-row"><div><strong>수정 {r.revision}회</strong><small>{new Date(r.savedAt).toLocaleString("ko-KR")} · {r.markdown.length}자</small></div><button disabled={pending} onClick={() => action(async () => { if (!active || !window.confirm("이 버전의 본문을 복원할까요? 현재 저장된 내용도 이력으로 남습니다.")) return; await store.save(); const latest = (await store.run(repo => repo.list())).find(n => n.id === active.id)!; await store.run(repo => repo.restoreRevision(latest.id, latest.revision, r.revision)); await store.reloadDraft(); setHistory([]); })}>이 본문 복원</button></div>)}</section><section className="card"><h2>휴지통</h2><p className="muted">영구 삭제하지 않습니다. 폴더 복원 시 함께 옮긴 하위 항목도 복원됩니다.</p>{trash.map(n => <div className="history-row" key={n.id}><div><strong>{n.name}</strong><small>{n.kind === "folder" ? "폴더" : "문서"}</small></div><button disabled={pending} onClick={() => action(async () => { await store.save(); await store.run(repo => repo.restore(n.id, n.revision)); })}>복원</button></div>)}{!trash.length && <p className="empty">휴지통이 비어 있습니다.</p>}</section></div></div>}
  </>;
}
