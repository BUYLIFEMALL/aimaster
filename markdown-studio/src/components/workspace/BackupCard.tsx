"use client";
import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { buildBackup, mergeRestoredPins, parseBackup, parseBackupPins, wrapInFolder } from "@/lib/documents/backup";
import { localDateStamp } from "@/lib/export/collect";
import { downloadBlob, formatBytes } from "@/lib/download";
import { useWorkspace } from "./WorkspaceProvider";

/** 전체 백업(JSON) 내려받기와 복원. 복원은 새 폴더 안에 추가하며 기존 문서를 덮어쓰지 않는다 */
export function BackupCard() {
  const store = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const liveCount = store.nodes.filter(n => !n.deletedAt).length;

  async function backup() {
    setBusy(true); setError(""); setMessage("");
    try {
      await store.save();
      const nodes = await store.run(repo => repo.list());
      const json = buildBackup(nodes, new Date(), store.preferences);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      downloadBlob(`markdown-backup_${localDateStamp()}.json`, blob);
      setMessage(`백업 파일(${formatBytes(blob.size)}, 문서·폴더 ${nodes.filter(n => !n.deletedAt).length}개)을 만들었습니다. 브라우저 내려받기 목록에서 저장 여부를 확인하세요.`);
    } catch (e) { setError(e instanceof Error ? e.message : "백업을 만들지 못했습니다."); }
    finally { setBusy(false); }
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error("백업 파일이 너무 큽니다. 50MB 이하만 복원할 수 있습니다.");
      const text = await file.text();
      const items = parseBackup(text);
      const pins = parseBackupPins(text, items);
      if (!items.length) throw new Error("백업 파일에 복원할 항목이 없습니다.");
      const stamp = new Date();
      const label = `복원 ${localDateStamp(stamp)} ${String(stamp.getHours()).padStart(2, "0")}${String(stamp.getMinutes()).padStart(2, "0")}`;
      if (!window.confirm(`문서·폴더 ${items.length}개를 '${label}' 폴더로 복원할까요?\n기존 문서는 바뀌지 않습니다.`)) return;
      await store.save();
      const result = await store.run(repo => repo.importTree(wrapInFolder(items, label)));
      // v1.16: 백업의 고정·꼬리표를 새로 만든 문서에 다시 연결(지금 설정에 더하기)
      let pinNote = "";
      if (pins.pinnedIds.length || Object.keys(pins.pinNames).length) {
        const merged = mergeRestoredPins(store.preferences, pins, result.ids);
        await store.setPreferences({ pinnedIds: merged.pinnedIds, pinColors: merged.pinColors, pinNames: merged.pinNames });
        if (merged.restoredPins) pinNote = ` 고정 ${merged.restoredPins}개와 색깔 꼬리표도 되살렸습니다.`;
      }
      setMessage(`${items.length}개 항목을 '${label}' 폴더로 복원했습니다.${result.renamed ? ` (같은 이름 ${result.renamed}개는 이름을 바꿨습니다)` : ""}${pinNote}`);
    } catch (e) { setError(e instanceof Error ? e.message : "복원하지 못했습니다."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  return <section className="card" aria-labelledby="backup-heading">
    <h2 id="backup-heading">백업·복원</h2>
    <p className="muted">문서는 이 브라우저에만 저장되므로 정기적으로 백업하세요. 백업 파일에는 문서·폴더의 이름·본문·구조와 대시보드 고정·색깔 꼬리표가 들어 있으며 수정 이력, 휴지통, 로그인 정보는 포함되지 않습니다.</p>
    <div className="actions" style={{ marginTop: 14 }}>
      <button type="button" className="download" disabled={busy || !liveCount} onClick={backup}><Download size={14}/>전체 백업 내려받기 (.json)</button>
      <input ref={input} type="file" accept=".json,application/json" hidden aria-label="복원할 백업 파일 선택" onChange={e => void restore(e.target.files?.[0])}/>
      <button type="button" disabled={busy} onClick={() => input.current?.click()}><Upload size={14}/>백업 파일로 복원</button>
    </div>
    {message ? <p role="status" style={{ marginTop: 12 }}>{message}</p> : null}
    {error ? <p className="error" role="alert" style={{ marginTop: 12 }}>{error}</p> : null}
  </section>;
}
