"use client";
import { useCallback, useEffect, useState } from "react";

interface Row { pageId: string; title: string; ownerId: string; ownerEmail: string; publishedTime: number | null; indexing: boolean; takenDown: boolean; reports: { reason: string; time: number }[] }

const when = (t: number | null) => (t ? new Date(t).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" }) : "-");

export function PublicPagesAdmin() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    const res = await fetch("/api/admin/public-pages", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setError(json.message ?? "목록을 불러오지 못했습니다.");
    setRows(json.pages);
  }, []);
  useEffect(() => void load(), [load]);
  const toggle = async (r: Row) => {
    setBusy(r.pageId);
    const res = await fetch("/api/admin/public-pages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pageId: r.pageId, down: !r.takenDown, reason: r.takenDown ? "" : "관리자 내리기" }) });
    setBusy("");
    if (!res.ok) return setError((await res.json().catch(() => ({}))).message ?? "처리하지 못했습니다.");
    await load();
  };
  if (error) return <p style={{ color: "#d44" }}>{error}</p>;
  if (!rows) return <p>불러오는 중…</p>;
  if (!rows.length) return <p>게시된 페이지가 없습니다.</p>;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={{ fontSize: 13 }}>게시 {rows.length}개 · 내린 것 {rows.filter((r) => r.takenDown).length}개 · 신고 받은 것 {rows.filter((r) => r.reports.length).length}개</p>
      {rows.map((r) => (
        <div key={r.pageId} style={{ border: "1px solid var(--lp-border-primary, #e5e5e5)", borderRadius: 10, padding: 14, background: r.takenDown ? "rgba(220,60,60,0.06)" : undefined }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ flex: 1, minWidth: 180 }}>{r.title}</strong>
            {r.takenDown && <span style={{ fontSize: 12, color: "#d44" }}>내림</span>}
            {r.indexing && <span style={{ fontSize: 12 }}>검색 노출 켬</span>}
            <a className="nc-dialog-btn outline small" href={`/public/${r.pageId.replace(/-/g, "")}`} target="_blank" rel="noreferrer">보기</a>
            <button className={`nc-dialog-btn small ${r.takenDown ? "outline" : "primary"}`} disabled={busy === r.pageId} onClick={() => void toggle(r)}>{r.takenDown ? "다시 열기" : "내리기"}</button>
          </div>
          <div style={{ fontSize: 12, color: "var(--lp-text-secondary, #777)", marginTop: 6 }}>게시: {r.ownerEmail || r.ownerId} · {when(r.publishedTime)}</div>
          {r.reports.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
              {r.reports.map((x, i) => <li key={i}>🚩 {x.reason} <span style={{ color: "#999" }}>({when(x.time)})</span></li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
