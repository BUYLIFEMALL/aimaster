"use client";

import { useState } from "react";
import { Sparkles, X, RefreshCw } from "lucide-react";

type Item = { title: string; ask: string; source: string; category?: string; importance: number; quickness: number; importanceReason: string; quicknessReason: string };
type Summary = { overview: string; items: Item[]; stale: { title: string; reason: string }[]; duplicates: { titles: string[]; reason: string }[] };
type Cached = { at: number; summary: Summary; truncated: boolean };

const CACHE_MS = 30 * 60 * 1000;
const cacheKey = (tab: string, text: string) => {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return `devdocs-ai:${tab}:${text.length}:${h}`;
};

/** 지금 보이는 메뉴(#devdocs-tab-content) 글자를 관리자 Claude 키로 정리해 팝업으로 보여 준다 */
export default function AiSummaryButton({ tab, label }: { tab: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Cached | null>(null);
  const [sort, setSort] = useState<"importance" | "quickness" | "category">("importance");

  async function run(force: boolean) {
    const text = (document.getElementById("devdocs-tab-content")?.innerText ?? "").trim();
    setOpen(true);
    setError("");
    if (!text) { setError("이 메뉴에 정리할 내용이 없습니다."); return; }
    const key = cacheKey(tab, text);
    if (!force) {
      try {
        const c = JSON.parse(sessionStorage.getItem(key) ?? "null") as Cached | null;
        if (c && Date.now() - c.at < CACHE_MS) { setData(c); return; }
      } catch { /* 저장소를 못 쓰면 새로 부른다 */ }
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dev-docs/ai-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tab, label, text }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI 정리에 실패했습니다.");
      const c: Cached = { at: Date.now(), summary: json.summary, truncated: !!json.truncated };
      setData(c);
      try { sessionStorage.setItem(key, JSON.stringify(c)); } catch { /* 무시 */ }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const items = data ? [...data.summary.items].sort((a, b) => sort === "quickness" ? b.quickness - a.quickness || b.importance - a.importance : b.importance - a.importance || b.quickness - a.quickness) : [];
  // 카테고리순: 분야별로 묶고, 각 묶음 안은 중요도 높은 순(items가 이미 중요도순). 묶음 순서는 그 안 최고 중요도가 높은 분야부터.
  const catGroups: [string, Item[]][] = (() => {
    const m = new Map<string, Item[]>();
    for (const it of items) { const c = it.category || "기타"; if (!m.has(c)) m.set(c, []); m.get(c)!.push(it); }
    return [...m.entries()].sort((a, b) => Math.max(...b[1].map((x) => x.importance)) - Math.max(...a[1].map((x) => x.importance)));
  })();
  const card = (it: Item, idx: number) => (
    <li key={idx} className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[1fr_1fr]">
      <div>
        <p className="text-base font-bold text-white">{idx + 1}. {it.title}</p>
        <p className="mt-1 text-[15px] leading-relaxed text-white/90">{it.ask}</p>
        <p className="mt-1.5 text-[13px] text-subtext">{it.source}{it.category ? ` · ${it.category}` : ""} · 중요도 {it.importance}/5 · 신속 {it.quickness}/5</p>
      </div>
      <div className="rounded-lg bg-amber-400/5 p-3 text-sm text-amber-100/90">
        <p className="mb-1 font-bold text-amber-200">💡 이렇게 본 이유</p>
        <p className="leading-relaxed">{sort === "quickness" ? it.quicknessReason : it.importanceReason}</p>
      </div>
    </li>
  );

  return (
    <>
      <button type="button" onClick={() => run(false)}
        className="mb-4 inline-flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-200 transition-colors hover:bg-amber-400/20">
        <Sparkles size={16} /> 🤖 AI 정리 — 「{label}」 중요한 것부터 보기
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-3">
              <h2 className="text-lg font-bold text-white">🤖 AI 정리 · {label}</h2>
              <div className="flex items-center gap-1">
                <button type="button" title="다시 분석" disabled={loading} onClick={() => run(true)} className="rounded-lg p-2 text-subtext hover:bg-white/10 hover:text-white disabled:opacity-40"><RefreshCw size={16} /></button>
                <button type="button" title="닫기" onClick={() => setOpen(false)} className="rounded-lg p-2 text-subtext hover:bg-white/10 hover:text-white"><X size={16} /></button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-4 text-base">
              {loading && <p className="py-10 text-center text-amber-200">Claude가 이 메뉴를 읽고 정리하고 있습니다… (보통 30초~1분)</p>}
              {error && !loading && <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-rose-200">{error}</p>}
              {data && !loading && (
                <>
                  <p className="mb-3 rounded-lg bg-white/5 p-4 text-[15px] leading-relaxed text-white/90">{data.summary.overview}</p>
                  {data.truncated && <p className="mb-3 text-xs text-amber-300">내용이 길어 앞부분 8만 자까지만 읽었습니다.</p>}
                  <div className="mb-3 flex gap-2">
                    {([["importance", "🔥 중요도순"], ["quickness", "⚡ 신속처리순"], ["category", "🗂 카테고리순"]] as const).map(([k, t]) => (
                      <button key={k} type="button" onClick={() => setSort(k)}
                        className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${sort === k ? "bg-amber-400 text-black" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>{t}</button>
                    ))}
                    <span className="ml-auto self-center text-[11px] text-subtext">{new Date(data.at).toLocaleTimeString("ko-KR")} 분석 · 30분 동안 같은 내용이면 다시 부르지 않음</span>
                  </div>
                  {items.length === 0 ? <p className="text-subtext">따로 챙길 항목이 없습니다.</p> : sort === "category" ? (
                    <div className="space-y-4">
                      {(() => { let n = 0; return catGroups.map(([cat, list]) => (
                        <div key={cat}>
                          <p className="mb-2 text-base font-bold text-amber-200">🗂 {cat} <span className="text-xs font-normal text-subtext">({list.length})</span></p>
                          <ol className="space-y-2">{list.map((it) => card(it, n++))}</ol>
                        </div>
                      )); })()}
                    </div>
                  ) : (
                    <ol className="space-y-2">{items.map((it, i) => card(it, i))}</ol>
                  )}
                  {data.summary.stale.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-1 text-base font-bold text-white">🧹 이미 끝났거나 필요 없어 보이는 항목</p>
                      <ul className="space-y-1 text-sm text-white/80">{data.summary.stale.map((s, i) => <li key={i}>· <b>{s.title}</b> — {s.reason}</li>)}</ul>
                    </div>
                  )}
                  {data.summary.duplicates.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-1 text-base font-bold text-white">🔁 겹치는 항목</p>
                      <ul className="space-y-1 text-sm text-white/80">{data.summary.duplicates.map((d, i) => <li key={i}>· {d.titles.join(" / ")} — {d.reason}</li>)}</ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
