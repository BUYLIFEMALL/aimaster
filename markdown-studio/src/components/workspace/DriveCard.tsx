"use client";
import { useEffect, useState } from "react";
import { CloudDownload, CloudUpload } from "lucide-react";
import type { PullStrategy, RemoteEntry, RemoteStatus, UploadStatus } from "@/lib/drive/sync";
import { useDrive } from "./DriveProvider";
import { useWorkspace } from "./WorkspaceProvider";

const UPLOAD_LABEL: Record<UploadStatus, string> = { created: "새로 올림", updated: "갱신함", unchanged: "변경 없음", conflict: "충돌 — 덮어쓰지 않음", failed: "실패" };
const REMOTE_LABEL: Record<RemoteStatus, string> = { new: "새 파일", same: "같음", "remote-changed": "Drive에서 변경됨", "both-changed": "양쪽 모두 변경됨" };
const PULL_LABEL = { imported: "가져옴", copied: "사본으로 추가", replaced: "내 문서 교체", skipped: "건너뜀", failed: "실패" } as const;

/** 문서 보관함의 Google Drive 동기화 카드(올리기·목록·가져오기) */
export function DriveCard() {
  const store = useWorkspace();
  const drive = useDrive();
  const [force, setForce] = useState(false);
  const [strategy, setStrategy] = useState<PullStrategy>("copy");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const docs = store.nodes.filter(n => n.kind === "document" && !n.deletedAt);
  const activeId = store.draft?.id;

  useEffect(() => { setPicked(new Set((drive.remote ?? []).filter(e => e.status === "new" || e.status === "remote-changed").map(e => e.file.id))); }, [drive.remote]);
  const failedUploads = drive.uploadResults.filter(r => r.status === "failed").map(r => r.nodeId);
  const selected = (drive.remote ?? []).filter(e => picked.has(e.file.id));
  const needsConfirm = strategy === "replace" && selected.some(e => e.status === "both-changed");

  if (!drive.loaded) return null;
  return <section className="card" aria-labelledby="drive-card-heading">
    <h2 id="drive-card-heading">Google Drive</h2>
    {!drive.account ? <>
      <p className="muted">내 Google Drive의 ‘마크다운 문서 자동화’ 폴더에 문서를 올리고 가져옵니다. 처음에는 <a className="subtle-link" href="/settings">API키등록·플랫폼연동</a>에서 내 Google 앱의 Client ID를 등록하고 연결하세요.</p>
      <div className="actions" style={{ marginTop: 12 }}>
        {drive.clientId
          ? <button type="button" className="download" onClick={() => void drive.connect()} disabled={drive.connecting}>{drive.connecting ? "연결 중…" : "Google에 연결"}</button>
          : <a className="button primary" href="/settings">연결 설정하기</a>}
      </div>
    </> : <>
      <p><strong>연결됨:</strong> {drive.account.email} <button type="button" onClick={() => void drive.disconnect()} disabled={drive.busy}>연결 해제</button></p>
      <div className="actions" style={{ marginTop: 12 }}>
        <button type="button" disabled={drive.busy || !activeId} onClick={() => void drive.upload([activeId!], force)}><CloudUpload size={14}/>현재 문서 올리기</button>
        <button type="button" disabled={drive.busy || !docs.length} onClick={() => void drive.upload(docs.map(d => d.id), force)}><CloudUpload size={14}/>전체 문서 올리기 ({docs.length})</button>
        <button type="button" disabled={drive.busy} onClick={() => void drive.loadRemote()}><CloudDownload size={14}/>Drive 목록 불러오기</button>
        <label className="checkbox-label"><input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)}/>내 문서로 덮어쓰기(Drive에서 바뀐 파일도)</label>
      </div>
    </>}

    {drive.busy ? <p role="status" style={{ marginTop: 12 }}>Google Drive와 통신 중입니다…</p> : null}
    {drive.message ? <p role="status" style={{ marginTop: 12 }}>{drive.message}</p> : null}
    {drive.error ? <p className="error" role="alert" style={{ marginTop: 12 }}>{drive.error}</p> : null}

    {drive.uploadResults.length ? <div className="notice" style={{ marginTop: 12 }} aria-label="올리기 결과">
      <ul>{drive.uploadResults.map(r => <li key={r.nodeId}>{r.path} — <strong>{UPLOAD_LABEL[r.status]}</strong>{r.message ? `: ${r.message}` : ""}</li>)}</ul>
      {failedUploads.length ? <button type="button" disabled={drive.busy || !drive.account} onClick={() => void drive.upload(failedUploads, force)}>실패한 {failedUploads.length}개 다시 시도</button> : null}
    </div> : null}

    {drive.remote ? <div className="stack" style={{ marginTop: 12 }} aria-label="Drive 파일 목록">
      {drive.remote.length ? <>
        <ul className="drive-list">{drive.remote.map(e => <li key={e.file.id}><label className="checkbox-label"><input type="checkbox" checked={picked.has(e.file.id)} onChange={ev => setPicked(p => { const n = new Set(p); if (ev.target.checked) n.add(e.file.id); else n.delete(e.file.id); return n; })} disabled={e.status === "same"}/>{e.path}</label> <small className={e.status === "both-changed" ? "error" : "muted"}>{REMOTE_LABEL[e.status]}</small></li>)}</ul>
        {drive.remoteIgnored ? <small className="muted">마크다운이 아닌 파일 {drive.remoteIgnored}개는 목록에서 제외했습니다.</small> : null}
        <fieldset className="option-group"><legend>Drive에서 바뀐 파일을 가져올 때</legend><div className="option-row">
          <label className={`choice ${strategy === "copy" ? "chosen" : ""}`}><input type="radio" name="strategy" checked={strategy === "copy"} onChange={() => setStrategy("copy")}/>내 문서는 그대로 두고 사본으로 추가 (권장)</label>
          <label className={`choice ${strategy === "replace" ? "chosen" : ""}`}><input type="radio" name="strategy" checked={strategy === "replace"} onChange={() => setStrategy("replace")}/>내 문서 본문을 Drive 내용으로 교체 (이전 본문은 수정 이력에 남음)</label>
        </div></fieldset>
        <div><button type="button" className="primary" disabled={drive.busy || !selected.length || !drive.account} onClick={() => { if (needsConfirm && !window.confirm("내 문서도 수정된 항목이 있습니다. Drive 내용으로 교체하면 내 수정은 수정 이력에서만 복원할 수 있습니다. 계속할까요?")) return; void drive.pull(selected, strategy); }}>선택한 {selected.length}개 가져오기</button></div>
      </> : <p className="empty">가져올 마크다운 파일이 없습니다.</p>}
    </div> : null}

    {drive.pullResults.length ? <div className="notice" style={{ marginTop: 12 }} aria-label="가져오기 결과">
      <ul>{drive.pullResults.map(r => <li key={r.path}>{r.path} — <strong>{PULL_LABEL[r.status]}</strong>{r.message ? `: ${r.message}` : ""}</li>)}</ul>
      {drive.pullResults.some(r => r.status === "failed") ? <button type="button" disabled={drive.busy || !drive.account} onClick={() => { const failed = new Set(drive.pullResults.filter(r => r.status === "failed").map(r => r.path)); void drive.pull((drive.remote ?? []).filter((e: RemoteEntry) => failed.has(e.path)), strategy); }}>실패한 항목 다시 시도</button> : null}
    </div> : null}
    {/* v1.20: 연결은 이 화면 메모리에만 있어 메뉴 이동·새로고침 때 풀린다는 안내 */}
    <p className="drive-reconnect-note" role="note">🔐 다른 메뉴로 이동하거나 새로고침하면 다시 [Google에 연결]을 눌러야 합니다. 보안을 위해 Google 연결 정보를 이 기기에 저장하지 않습니다.</p>
    <p className="muted" style={{ marginTop: 12 }}><small>Drive 파일은 삭제하지 않습니다. 로컬 휴지통과 Drive는 별개입니다. 폴더 이름 변경·이동은 Drive 폴더에 반영되지 않고, 문서의 이름·이동은 반영됩니다.</small></p>
  </section>;
}
