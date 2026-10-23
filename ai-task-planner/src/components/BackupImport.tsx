"use client";
import { useState } from "react";
import { MAX_BACKUP_BYTES, parseBackup, mergeBackup, type Backup } from "@/lib/planner/backup";
import type { Workspace } from "@/lib/planner/model";
import type { Command } from "@/lib/planner/engine";
export function BackupImport({ workspace, revision, busy, hasDrafts, command }: { workspace: Workspace; revision: number; busy: boolean; hasDrafts: boolean; command: (command: Command) => Promise<boolean> }) {
  const [preview, setPreview] = useState<{ backup: Backup; revision: number; stats: ReturnType<typeof mergeBackup>["stats"] } | null>(null), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [restoreSettings, setRestoreSettings] = useState(false);
  const active = workspace.sessions.some(s => s.state === "running" || s.state === "paused");
  return <section className="card"><h2>JSON 백업 가져오기</h2><p>현재 기록에 없는 항목만 추가합니다. 같은 ID의 내용이나 날짜별 노트가 다르면 현재 기록을 보존하고 건너뜁니다. 타이머 설정은 유지하며 백업 타이머는 종료 상태로 가져옵니다.</p>
    {active && <p>현재 타이머를 정산 종료한 뒤 가져올 수 있습니다.</p>}{hasDrafts && <p>작성 중인 성과 노트를 먼저 저장해주세요.</p>}
    <label>백업 JSON 파일 (4MiB 이하)<input type="file" accept=".json,application/json" disabled={busy || active || hasDrafts} onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ""; setPreview(null); setError(""); setSuccess("");
      if (!file) return;
      try { if (file.size > MAX_BACKUP_BYTES) throw new Error("백업 파일은 4MiB 이하만 가져올 수 있습니다."); const backup = parseBackup(await file.text()); const { stats } = mergeBackup(workspace, backup); setPreview({ backup, revision, stats }); }
      catch (err) { setError(err instanceof Error ? err.message : "백업 형식을 확인해주세요."); }
    }}/></label>
    {preview && <div aria-label="백업 가져오기 미리보기"><p>추가: 할 일 {preview.stats.tasks}개 · 세션 {preview.stats.sessions}개 · 노트 {preview.stats.notes}개 · 분류 {preview.stats.categories}개</p><p>중복 {preview.stats.duplicates}개 · 충돌 {preview.stats.conflicts}개는 건너뜁니다.</p>{preview.revision !== revision && <p>기록이 변경됐습니다. 파일을 다시 선택해 미리보기를 확인해주세요.</p>}<button className="primary" disabled={busy || active || hasDrafts || preview.revision !== revision} onClick={async () => {
      if (await command({ type: "backup.merge", backup: preview.backup, restoreSettings })) { setPreview(null); setSuccess("백업 항목을 서버에 추가했습니다. 기존 기록은 보존했습니다."); }
    }}>가져오기 확정</button></div>}
    {preview && <label className="restore-settings"><input type="checkbox" checked={restoreSettings} onChange={e => setRestoreSettings(e.target.checked)}/>백업의 타이머·분석 모델 설정도 적용</label>}
    {error && <p role="alert">{error}</p>}{success && <p role="status">{success}</p>}
  </section>;
}
