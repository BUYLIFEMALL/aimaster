"use client";
import { useCallback, useEffect, useState } from "react";
import { FilePlus2, Trash2 } from "lucide-react";

interface Row { id: string; name: string; component_count: number; updated_at: string }

function when(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

export function ProjectList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "프로젝트 목록을 불러오지 못했습니다."); setRows([]); return; }
      setError("");
      setRows(data.projects ?? []);
    } catch {
      setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setRows([]);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "제목 없는 디자인" }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "프로젝트를 만들지 못했습니다."); return; }
      window.location.assign(`/editor/${data.project.id}`);
    } catch {
      setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    if (!window.confirm(`"${row.name}" 프로젝트를 삭제할까요? 삭제하면 되돌릴 수 없습니다.`)) return;
    const res = await fetch(`/api/projects/${row.id}`, { method: "DELETE" });
    if (!res.ok) { setError("삭제하지 못했습니다. 다시 시도해 주세요."); return; }
    setRows((r) => (r ?? []).filter((x) => x.id !== row.id));
  }

  return (
    <div className="card">
      <div className="actions">
        <button type="button" className="primary" disabled={busy} onClick={create}><FilePlus2 size={15} />{busy ? "만드는 중…" : "새 프로젝트"}</button>
      </div>
      {error && <p role="alert" className="error" style={{ marginTop: 12 }}>{error}</p>}
      {rows === null ? (
        <p className="empty">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="empty">아직 프로젝트가 없습니다. [새 프로젝트]로 첫 디자인을 시작해 보세요.</p>
      ) : (
        <div className="project-grid">
          {rows.map((r) => (
            <div key={r.id} className="project-card">
              <h3>{r.name}</h3>
              <small>컴포넌트 {r.component_count}개 · {when(r.updated_at)}</small>
              <div className="actions">
                <a className="button primary" href={`/editor/${r.id}`}>열기</a>
                <button type="button" onClick={() => remove(r)} aria-label={`${r.name} 삭제`}><Trash2 size={14} />삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
