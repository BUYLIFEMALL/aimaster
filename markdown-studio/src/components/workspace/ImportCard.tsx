"use client";
import { useRef, useState } from "react";
import { FolderUp, Upload } from "lucide-react";
import { itemsFromFiles, type FileInput } from "@/lib/documents/backup";
import { useWorkspace } from "./WorkspaceProvider";

interface Summary { created: number; renamed: number; skipped: string[]; errors: { name: string; error: string }[]; notes: string[]; openId: string | null }

/** 마크다운·텍스트 파일 또는 폴더 가져오기 (기존 문서를 덮어쓰지 않고 새 문서로 추가) */
export function ImportCard() {
  const store = useWorkspace();
  const files = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);
  const [parentId, setParentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [message, setMessage] = useState("");

  async function importList(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true); setSummary(null); setMessage("");
    try {
      const inputs: FileInput[] = [];
      const json: string[] = [];
      for (const f of Array.from(list)) {
        const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
        if (/\.json$/i.test(f.name)) { json.push(f.name); continue; }
        inputs.push({ path, bytes: await f.arrayBuffer() });
      }
      const report = itemsFromFiles(inputs);
      const skipped = [...report.skipped, ...json.map(n => `${n} (백업 파일은 '4. 문서 보관함'에서 복원하세요)`)];
      if (!report.items.length) { setSummary({ created: 0, renamed: 0, skipped, errors: report.errors, notes: report.notes, openId: null }); return; }
      await store.save();
      const result = await store.run(repo => repo.importTree(report.items, parentId || null));
      setSummary({ created: report.imported, renamed: result.renamed, skipped, errors: report.errors, notes: report.notes, openId: result.firstDocumentId });
    } catch (e) { store.reportError(e); setMessage(e instanceof Error ? e.message : "가져오지 못했습니다."); }
    finally { setBusy(false); if (files.current) files.current.value = ""; if (folder.current) folder.current.value = ""; }
  }

  return <section className="card stack" aria-labelledby="import-heading">
    <h2 id="import-heading">파일 가져오기</h2>
    <p className="muted">마크다운(.md, .markdown)과 텍스트(.txt) 파일 또는 폴더를 가져옵니다. 기존 문서는 바뀌지 않으며, 같은 이름이 있으면 이름 뒤에 (2)를 붙입니다. 파일은 서버로 전송되지 않고 이 브라우저에만 저장됩니다.</p>
    <label>가져올 위치<select aria-label="가져올 위치" value={parentId} onChange={e => setParentId(e.target.value)} disabled={busy}><option value="">최상위</option>{store.nodes.filter(n => n.kind === "folder" && !n.deletedAt).map(n => <option value={n.id} key={n.id}>{n.name}</option>)}</select></label>
    <div className="actions">
      <input ref={files} type="file" accept=".md,.markdown,.txt,.json" multiple hidden aria-label="가져올 파일 선택" onChange={e => void importList(e.target.files)}/>
      <input ref={folder} type="file" hidden aria-label="가져올 폴더 선택" onChange={e => void importList(e.target.files)} {...({ webkitdirectory: "" } as object)}/>
      <button type="button" disabled={busy} onClick={() => files.current?.click()}><Upload size={14}/>파일 선택</button>
      <button type="button" disabled={busy} onClick={() => folder.current?.click()}><FolderUp size={14}/>폴더 선택</button>
    </div>
    {busy ? <p role="status">가져오는 중…</p> : null}
    {message ? <p className="error" role="alert">{message}</p> : null}
    {summary ? <div className="notice" role="status" aria-label="가져오기 결과">
      <strong>{summary.created}개 문서를 가져왔습니다.</strong>{summary.renamed ? ` (같은 이름 ${summary.renamed}개는 이름을 바꿨습니다)` : ""}
      {summary.errors.length ? <><p>가져오지 못한 파일 {summary.errors.length}개</p><ul>{summary.errors.map(x => <li key={x.name}>{x.name}: {x.error}</li>)}</ul></> : null}
      {summary.skipped.length ? <><p>건너뛴 파일 {summary.skipped.length}개</p><ul>{summary.skipped.slice(0, 20).map(x => <li key={x}>{x}</li>)}</ul></> : null}
      {summary.notes.length ? <ul>{summary.notes.slice(0, 10).map(x => <li key={x}>{x}</li>)}</ul> : null}
      {summary.openId ? <button type="button" onClick={async () => { await store.select(summary.openId!); window.location.assign("/editor"); }}>가져온 문서 열기</button> : null}
    </div> : null}
  </section>;
}
