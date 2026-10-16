"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { FEATURE_INFO, type Feature, type ReportSummary } from "@/lib/kw/types";

const title = (id: string) => FEATURE_INFO.find((f) => f.id === id)?.title ?? id;

export function HistoryList() {
  const [list, setList] = useState<ReportSummary[] | null>(null);
  const [error, setError] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);
  const [query, setQuery] = useState("");
  const [feature, setFeature] = useState<Feature | "all">("all");

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

  // 기능별 개수(필터 칩에 표시) — 기록에 있는 기능만 칩으로 보여 준다
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of list ?? []) m.set(r.feature, (m.get(r.feature) ?? 0) + 1);
    return m;
  }, [list]);

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!list) return <p className="muted">불러오는 중…</p>;
  const q = query.trim().toLowerCase();
  const shown = list.filter(
    (r) => (!onlyFav || r.favorite) && (feature === "all" || r.feature === feature) && (!q || r.keyword.toLowerCase().includes(q)),
  );
  const filtered = onlyFav || feature !== "all" || !!q;
  return (
    <div className="stack">
      <div className="card stack" style={{ gap: 12, padding: 16 }}>
        <div className="kw-hist-tools">
          <input aria-label="키워드로 기록 찾기" placeholder="🔎 키워드로 기록 찾기" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="actions">
            <button type="button" aria-pressed={onlyFav} onClick={() => setOnlyFav((v) => !v)}><Star size={13} />즐겨찾기만 보기</button>
            <span className="muted">{shown.length} / {list.length}건 · 최근 100건 보관(즐겨찾기 제외)</span>
          </div>
        </div>
        {counts.size > 1 && (
          <div className="kw-filter" role="group" aria-label="분석 종류로 거르기">
            <button type="button" aria-pressed={feature === "all"} onClick={() => setFeature("all")}>전체<b>{list.length}</b></button>
            {FEATURE_INFO.filter((f) => counts.has(f.id)).map((f) => (
              <button key={f.id} type="button" aria-pressed={feature === f.id} onClick={() => setFeature(f.id)}>{f.title}<b>{counts.get(f.id)}</b></button>
            ))}
          </div>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="kw-empty">{filtered ? "조건에 맞는 기록이 없습니다." : "아직 분석 기록이 없습니다. [분석하기]에서 첫 분석을 시작해 보세요."}</p>
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
