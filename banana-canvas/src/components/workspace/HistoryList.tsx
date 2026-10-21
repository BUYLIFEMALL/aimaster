"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, ImageIcon, Star, Trash2 } from "lucide-react";
import { KIND_LABEL, type Kind } from "@/lib/bnc/types";

interface Row { id: string; kind: Kind; title: string; prompt: string; model: string; favorite: boolean; created_at: string; count: number; cover: string | null }
interface Detail { id: string; outputs: { path: string; url: string | null; text?: string; mime?: string }[]; kind: Kind }

function when(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

async function saveImage(url: string, name: string) {
  try {
    const blob = await (await fetch(url)).blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1500);
  } catch { window.open(url, "_blank", "noopener"); }
}

export function HistoryList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);
  const [open, setOpen] = useState<Detail | null>(null);

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
    if (!window.confirm(`"${r.title || KIND_LABEL[r.kind]}" 결과를 삭제할까요? 이미지도 함께 삭제되며 되돌릴 수 없습니다.`)) return;
    const res = await fetch(`/api/history/${r.id}`, { method: "DELETE" });
    if (!res.ok) { setError("삭제하지 못했습니다. 다시 시도해 주세요."); return; }
    setRows((rs) => (rs ?? []).filter((x) => x.id !== r.id));
    if (open?.id === r.id) setOpen(null);
  }

  async function show(r: Row) {
    const res = await fetch(`/api/history/${r.id}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error ?? "결과를 열지 못했습니다."); return; }
    setOpen({ id: r.id, kind: r.kind, outputs: data.item.outputs });
  }

  const shown = (rows ?? []).filter((r) => !onlyFav || r.favorite);
  return (
    <div className="card">
      <div className="actions">
        <a className="button primary" href="/studio">새 작업</a>
        <button type="button" aria-pressed={onlyFav} onClick={() => setOnlyFav((v) => !v)}><Star size={14} />즐겨찾기만</button>
        <small>최근 30건까지 보관하며(즐겨찾기 제외), 모든 결과는 만든 날부터 30일 뒤 자동 삭제됩니다. 필요한 이미지는 내려받아 두세요.</small>
      </div>
      {error && <p role="alert" className="error" style={{ marginTop: 12 }}>{error}</p>}
      {rows === null ? <p className="empty">불러오는 중…</p> : shown.length === 0 ? (
        <p className="empty">{onlyFav ? "즐겨찾기한 결과가 없습니다." : "아직 결과가 없습니다. [새 작업]으로 첫 이미지를 만들어 보세요."}</p>
      ) : (
        <div className="project-grid">
          {shown.map((r) => (
            <div key={r.id} className="project-card">
              <div className="bc-cover" onClick={() => void show(r)}>{r.cover ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.cover} alt="" /> : <ImageIcon size={28} />}</div>
              <h3>{KIND_LABEL[r.kind] ?? r.kind}{r.title ? ` · ${r.title}` : ""}</h3>
              <small>{r.count}장 · {when(r.created_at)}</small>
              <div className="actions">
                <button type="button" className="primary" onClick={() => void show(r)}>열기</button>
                <a className="button" href={`/studio?from=${r.id}`}>이어서 편집</a>
                <button type="button" aria-pressed={r.favorite} aria-label="즐겨찾기" onClick={() => void toggleFav(r)}><Star size={14} fill={r.favorite ? "currentColor" : "none"} /></button>
                <button type="button" onClick={() => void remove(r)} aria-label={`${r.title || KIND_LABEL[r.kind]} 삭제`}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && (
        <div className="bc-zoom multi" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="bc-zoom-body" onClick={(e) => e.stopPropagation()}>
            <div className="bc-outs multi">
              {open.outputs.map((o, i) => (
                <figure key={`${o.path}-${i}`} className="bc-out">
                  {o.url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={o.url} alt={`결과 ${i + 1}`} /> : <div className="bc-noimg">이미지 없음</div>}
                  {o.text && <figcaption>{o.text}</figcaption>}
                  {o.url && <div className="actions"><button type="button" onClick={() => void saveImage(o.url!, `banana_${open.kind}_${i + 1}${o.mime?.includes("jpeg") ? ".jpg" : ".png"}`)}><Download size={13} />다운로드</button></div>}
                </figure>
              ))}
            </div>
            <button type="button" className="bc-zoom-close" onClick={() => setOpen(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
