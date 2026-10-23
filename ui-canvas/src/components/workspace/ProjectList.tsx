"use client";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, FilePlus2, Layers, PencilRuler, Trash2 } from "lucide-react";

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
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <button type="button" className="primary" disabled={busy} onClick={create} style={{ padding: "8px 16px" }}>
          <FilePlus2 size={16} />
          <span>{busy ? "만드는 중…" : "새 프로젝트 생성"}</span>
        </button>
        {rows && rows.length > 0 && (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            총 <strong>{rows.length}</strong>개 프로젝트
          </span>
        )}
      </div>
      {error && <p role="alert" className="error" style={{ marginTop: 12 }}>{error}</p>}
      {rows === null ? (
        <p className="empty">프로젝트 목록을 불러오는 중입니다…</p>
      ) : rows.length === 0 ? (
        <div className="empty" style={{ padding: "48px 12px" }}>
          <PencilRuler size={36} style={{ color: "var(--muted-dark)", marginBottom: 12, opacity: 0.6 }} />
          <p style={{ color: "var(--foreground)", fontWeight: 600, marginBottom: 6 }}>아직 생성된 프로젝트가 없습니다.</p>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>[새 프로젝트 생성] 버튼을 눌러 첫 화면 프로토타이핑을 시작해 보세요.</p>
        </div>
      ) : (
        <div className="project-grid">
          {rows.map((r) => (
            <div key={r.id} className="project-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <h3>{r.name}</h3>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "rgba(6, 182, 212, 0.12)",
                  color: "#67e8f9",
                  fontWeight: 600,
                  flexShrink: 0
                }}>
                  <Layers size={11} /> {r.component_count}
                </span>
              </div>
              <small>마지막 수정: {when(r.updated_at)}</small>
              <div className="actions" style={{ marginTop: 12 }}>
                <a className="button primary" href={`/editor/${r.id}`} style={{ flex: 1 }}>
                  <ExternalLink size={13} /> 캔버스 열기
                </a>
                <button
                  type="button"
                  onClick={() => remove(r)}
                  aria-label={`${r.name} 삭제`}
                  style={{ color: "var(--muted)", borderColor: "var(--line)" }}
                  title="프로젝트 삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
