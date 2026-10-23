"use client";
import { useCallback, useEffect, useState } from "react";
import { FileAudio, FileImage, FileVideo, Star, Trash2 } from "lucide-react";
import { MEDIA_LABEL, type MediaType } from "@/lib/rpa/types";

interface Row { id: string; title: string; media_type: MediaType; file_name: string; prompt: string; model_used: string; thumb: string | null; favorite: boolean; created_at: string }
const ICON = { image: FileImage, video: FileVideo, audio: FileAudio };

function when(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

export function HistoryList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/history", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "기록을 불러오지 못했습니다."); setRows([]); return; }
      setError(""); setRows(data.items ?? []);
    } catch { setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."); setRows([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function toggleFav(r: Row) {
    setRows((rs) => (rs ?? []).map((x) => (x.id === r.id ? { ...x, favorite: !r.favorite } : x)));
    const res = await fetch(`/api/history/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ favorite: !r.favorite }) });
    if (!res.ok) void load();
  }

  async function remove(r: Row) {
    if (!window.confirm(`"${r.title}" 기록을 삭제할까요? 삭제하면 되돌릴 수 없습니다.`)) return;
    const res = await fetch(`/api/history/${r.id}`, { method: "DELETE" });
    if (!res.ok) { setError("삭제하지 못했습니다. 다시 시도해 주세요."); return; }
    setRows((rs) => (rs ?? []).filter((x) => x.id !== r.id));
  }

  const shown = (rows ?? []).filter((r) => !onlyFav || r.favorite);
  return (
    <div className="card">
      <div className="actions">
        <a className="button primary" href="/analyze">새 분석</a>
        <button type="button" aria-pressed={onlyFav} onClick={() => setOnlyFav((v) => !v)}><Star size={14} />즐겨찾기만</button>
        <small>최근 100건까지 보관합니다(즐겨찾기는 유지).</small>
      </div>
      {error && <p role="alert" className="error" style={{ marginTop: 12 }}>{error}</p>}
      {rows === null ? <p className="empty">불러오는 중…</p> : shown.length === 0 ? (
        <p className="empty">{onlyFav ? "즐겨찾기한 기록이 없습니다." : "아직 분석 기록이 없습니다. [새 분석]으로 첫 파일을 올려 보세요."}</p>
      ) : (
        <div className="project-grid">
          {shown.map((r) => {
            const Icon = ICON[r.media_type];
            return (
              <div key={r.id} className="project-card">
                <div className="rp-hthumb">
                  {r.thumb ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.thumb} alt="" /> : <Icon size={28} />}
                </div>
                <h3>{r.title}</h3>
                <small>{MEDIA_LABEL[r.media_type]} · {when(r.created_at)}</small>
                <p className="rp-snippet">{r.prompt}</p>
                <div className="actions">
                  <a className="button primary" href={`/analyze?h=${r.id}`}>열기</a>
                  <button type="button" aria-pressed={r.favorite} aria-label="즐겨찾기" onClick={() => void toggleFav(r)}><Star size={14} fill={r.favorite ? "currentColor" : "none"} /></button>
                  <button type="button" onClick={() => void remove(r)} aria-label={`${r.title} 삭제`}><Trash2 size={14} />삭제</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
