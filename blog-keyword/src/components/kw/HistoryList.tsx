"use client";
import { useCallback, useEffect, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { FEATURE_INFO, type ReportSummary } from "@/lib/kw/types";

const title = (id: string) => FEATURE_INFO.find((f) => f.id === id)?.title ?? id;

export function HistoryList() {
  const [list, setList] = useState<ReportSummary[] | null>(null);
  const [error, setError] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/history", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setList(data.reports ?? []);
      else setError(data.error ?? "기록을 불러오지 못했습니다.");
    } catch {
      setError("서버에 연결하지 못했습니다.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function toggle(r: ReportSummary) {
    setList((cur) => cur?.map((x) => (x.id === r.id ? { ...x, favorite: !x.favorite } : x)) ?? cur);
    const res = await fetch("/api/history", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, favorite: !r.favorite }) });
    if (!res.ok) void load();
  }

  async function remove(r: ReportSummary) {
    if (!window.confirm(`"${r.keyword}" 분석 기록을 삭제할까요?`)) return;
    const res = await fetch(`/api/history?id=${r.id}`, { method: "DELETE" });
    if (res.ok) setList((cur) => cur?.filter((x) => x.id !== r.id) ?? cur);
    else setError("삭제하지 못했습니다.");
  }

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!list) return <p className="muted">불러오는 중…</p>;
  const shown = onlyFav ? list.filter((r) => r.favorite) : list;
  return (
    <div className="stack">
      <div className="actions">
        <button type="button" aria-pressed={onlyFav} onClick={() => setOnlyFav((v) => !v)}><Star size={13} />즐겨찾기만 보기</button>
        <span className="muted">최근 기록 100건까지 보관됩니다(즐겨찾기는 제외).</span>
      </div>
      {shown.length === 0 ? (
        <p className="kw-empty">{onlyFav ? "즐겨찾기한 기록이 없습니다." : "아직 분석 기록이 없습니다. [분석하기]에서 첫 분석을 시작해 보세요."}</p>
      ) : (
        <ul className="kw-history">
          {shown.map((r) => (
            <li key={r.id}>
              <a href={`/dashboard?report=${r.id}`} className="kw-hist-main">
                <span className="kw-badge">{title(r.feature)}</span>
                <strong>{r.keyword}</strong>
                <small>{new Date(r.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</small>
              </a>
              <button type="button" aria-label={r.favorite ? "즐겨찾기 해제" : "즐겨찾기"} aria-pressed={r.favorite} onClick={() => toggle(r)}><Star size={14} /></button>
              <button type="button" aria-label="삭제" onClick={() => remove(r)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
