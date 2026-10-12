"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Folder, Plus, Search, Trash2, Pencil } from "lucide-react";
import { type DocumentNode, descendants, searchNodes } from "@/lib/documents/model";
import { messageForError, useWorkspace } from "./WorkspaceProvider";

export function DocumentExplorer({ compact = false }: { compact?: boolean }) {
  const store = useWorkspace();
  const [query, setQuery] = useState("");
  const [searchContent, setSearchContent] = useState(false);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<DocumentNode | null>(null);
  const [rename, setRename] = useState("");
  const [moveId, setMoveId] = useState("");
  const [creating, setCreating] = useState<"document" | "folder" | null>(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const live = store.nodes.filter(n => !n.deletedAt);
  const matches = new Set(searchNodes(store.nodes, query, searchContent).map(n => n.id));
  const shown = new Set(matches);
  if (query) for (const n of live.filter(n => matches.has(n.id))) {
    let parent = n.parentId;
    while (parent && !shown.has(parent)) { shown.add(parent); parent = live.find(p => p.id === parent)?.parentId ?? null; }
  }
  async function action(work: () => Promise<unknown>) {
    setPending(true); setError("");
    try { await store.save(); await work(); return true; } catch (e) { setError(messageForError(e)); return false; }
    finally { setPending(false); }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!creating) return;
    const ok = await action(async () => {
      const node = await store.run(repo => repo.create(creating, name, parentId || null));
      if (node.kind === "document") await store.select(node.id);
    });
    if (ok) { setCreating(null); setName(""); }
  }
  async function renameMove(e: React.FormEvent) {
    e.preventDefault(); if (!editing) return;
    const current = store.nodes.find(n => n.id === editing.id);
    if (!current) return;
    const ok = await action(async () => {
      const latest = (await store.run(repo => repo.list())).find(n => n.id === current.id)!;
      await store.run(repo => repo.update(latest.id, latest.revision, { name: rename, parentId: moveId || null }));
      if (store.draft?.id === latest.id) await store.reloadDraft();
    });
    if (ok) setEditing(null);
  }
  function folderOptions(excludeId?: string) {
    const excluded = excludeId ? descendants(live, excludeId) : new Set<string>();
    return live.filter(n => n.kind === "folder" && !excluded.has(n.id)).map(n => <option key={n.id} value={n.id}>{n.name}</option>);
  }
  function tree(parent: string | null, depth = 0): React.ReactNode {
    return live.filter(n => n.parentId === parent && shown.has(n.id)).map(node => <div key={node.id}>
      <div className={`tree-row ${store.draft?.id === node.id ? "selected" : ""}`} style={{ paddingLeft: 8 + depth * 15 }} draggable={!pending} onDragStart={e => e.dataTransfer.setData("application/x-markdown-node", node.id)} onDragOver={e => { if (node.kind === "folder") e.preventDefault(); }} onDrop={e => { e.preventDefault(); e.stopPropagation(); const id = e.dataTransfer.getData("application/x-markdown-node"); const source = live.find(n => n.id === id); if (source && node.kind === "folder") void action(async () => { const latest = (await store.run(repo => repo.list())).find(n => n.id === source.id)!; await store.run(repo => repo.update(latest.id, latest.revision, { parentId: node.id })); if (store.draft?.id === latest.id) await store.reloadDraft(); }); }}>
        <button className="tree-open" disabled={pending} aria-label={node.kind === "folder" ? `${node.name} 펼치기 또는 접기` : `${node.name} 열기`} onClick={() => { if (node.kind === "document") void action(() => store.select(node.id)); else setClosed(prev => { const next = new Set(prev); next.has(node.id) ? next.delete(node.id) : next.add(node.id); return next; }); }}>
          {node.kind === "folder" ? <>{closed.has(node.id) && !query ? <ChevronRight size={12}/> : <ChevronDown size={12}/>}<Folder size={15}/></> : <FileText size={15}/>}<span>{node.name}</span>
        </button>
        <button className="icon-button" disabled={pending} aria-label={`${node.name} 이름 및 위치 변경`} onClick={() => { setEditing(node); setRename(node.name); setMoveId(node.parentId || ""); setError(""); }}><Pencil size={13}/></button>
        <button className="icon-button" disabled={pending} aria-label={`${node.name} 휴지통으로 이동`} onClick={() => { if (window.confirm(`${node.name}${node.kind === "folder" ? " 및 하위 항목" : ""}을 휴지통으로 옮길까요? 나중에 복원할 수 있습니다.`)) void action(async () => { const latest = (await store.run(repo => repo.list())).find(n => n.id === node.id)!; await store.run(repo => repo.trash(latest.id, latest.revision)); if (store.draft && descendants(live, latest.id).has(store.draft.id)) await store.reloadDraft(); }); }}><Trash2 size={13}/></button>
      </div>
      {node.kind === "folder" && (!closed.has(node.id) || query) && tree(node.id, depth + 1)}
    </div>);
  }
  return <section className={compact ? "explorer compact" : "card explorer"} aria-label="문서 탐색기">
    <div className="panel-heading"><h2>내 문서</h2><div className="actions"><button className="icon-button" aria-label="새 문서" onClick={() => { setCreating("document"); setName("새 문서.md"); setError(""); }}><Plus size={16}/><FileText size={15}/></button><button className="icon-button" aria-label="새 폴더" onClick={() => { setCreating("folder"); setName(""); setError(""); }}><Plus size={16}/><Folder size={15}/></button></div></div>
    <div className="search-box"><Search size={15}/><input aria-label="문서 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="문서 이름 검색"/></div><label className="checkbox-label"><input type="checkbox" checked={searchContent} onChange={e => setSearchContent(e.target.checked)}/>본문도 검색</label>
    {error && <p role="alert" className="error">{error}</p>}
    {creating && <form className="inline-form" onSubmit={create}><h3>{creating === "document" ? "새 문서" : "새 폴더"}</h3><input aria-label="새 항목 이름" value={name} onChange={e => setName(e.target.value)} required maxLength={120}/><select aria-label="새 항목 폴더" value={parentId} onChange={e => setParentId(e.target.value)}><option value="">최상위</option>{folderOptions()}</select><div className="actions"><button className="primary" disabled={pending}>만들기</button><button type="button" onClick={() => setCreating(null)}>취소</button></div></form>}
    {editing && <form className="inline-form" onSubmit={renameMove}><h3>이름 및 위치 변경</h3><input aria-label="변경할 이름" value={rename} onChange={e => setRename(e.target.value)} required maxLength={120}/><select aria-label="이동할 폴더" value={moveId} onChange={e => setMoveId(e.target.value)}><option value="">최상위</option>{folderOptions(editing.id)}</select><div className="actions"><button className="primary" disabled={pending}>변경 저장</button><button type="button" onClick={() => setEditing(null)}>취소</button></div></form>}
    <div className="tree">{tree(null)}{!live.length && <p className="empty">아직 문서가 없습니다. 새 문서부터 시작하세요.</p>}{live.length > 0 && !matches.size && <p className="empty">검색 결과가 없습니다.</p>}</div>
  </section>;
}
