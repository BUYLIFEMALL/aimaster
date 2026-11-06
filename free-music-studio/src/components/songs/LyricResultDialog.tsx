"use client";

// AI 가사 결과 창 — 원본 boks-music `src/App.tsx`(MIT, © 2026 boksajang)의 결과 창을 옮김(2026-11-06).
// 결과를 입력 칸에 바로 덮어쓰지 않고 [현재 가사 적용]·[AI 수정]·[삭제 후 새로 생성]·[나중에] 중에서 고른다.
// 원본은 계정에 저장하지만, 여기서는 DB를 늘리지 않고 이 브라우저에 최근 20개를 보관한다(다른 PC에서는 안 보임).
import { Check, Clock, RefreshCw, Sparkles, Trash2, Wand2, X } from "lucide-react";

export type LyricResult = { id: string; at: string; mode: "create" | "edit"; title: string; style_prompt: string; lyrics: string; calls: number };

const KEY = "fms.lyricResults";
export const LYRIC_RESULTS_MAX = 20;

export function loadLyricResults(): LyricResult[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((r) => r && typeof r.lyrics === "string").slice(0, LYRIC_RESULTS_MAX) : [];
  } catch {
    return [];
  }
}
export function saveLyricResults(list: LyricResult[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, LYRIC_RESULTS_MAX)));
  } catch {}
}

export function LyricResultDialog({
  result,
  history,
  busy,
  onApply,
  onRefine,
  onRedo,
  onLater,
  onPick,
  onDelete,
}: {
  result: LyricResult | null;
  history: LyricResult[];
  busy: boolean;
  onApply: (r: LyricResult) => void;
  onRefine: (r: LyricResult) => void;
  onRedo: (r: LyricResult) => void;
  onLater: () => void;
  onPick: (r: LyricResult) => void;
  onDelete: (r: LyricResult) => void;
}) {
  const btn = "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-40";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onLater}>
      <div role="dialog" aria-label="AI 가사 결과" onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-[#0a0f1d] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
          <Sparkles className="h-4 w-4 text-teal-300" />
          <p className="text-sm font-bold text-slate-100">AI 가사 결과</p>
          <button type="button" onClick={onLater} aria-label="닫기" className="ml-auto rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-[1fr_200px]">
          {result ? (
            <div className="min-w-0 space-y-2">
              <p className="text-base font-bold text-slate-100">{result.title || "(제목 없음)"}</p>
              {result.style_prompt && <p className="rounded-lg bg-slate-950/60 p-2.5 font-mono text-[11px] text-teal-300/80">{result.style_prompt}</p>}
              <pre className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-950/60 p-3 font-sans text-xs leading-relaxed text-slate-200">{result.lyrics}</pre>
              <p className="text-[10px] text-slate-500">
                {result.mode === "edit" ? "다듬은 가사" : "새로 쓴 가사"} · {new Date(result.at).toLocaleString("ko-KR")} · AI 호출 {result.calls}번
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">왼쪽 「최근 결과」에서 고르면 여기에 보입니다.</p>
          )}
          <div className="space-y-1.5">
            <p className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
              <Clock className="h-3.5 w-3.5" /> 최근 결과 {history.length}/{LYRIC_RESULTS_MAX}
            </p>
            {history.length === 0 && <p className="text-[11px] text-slate-600">아직 없습니다.</p>}
            <ul className="space-y-1">
              {history.map((r) => (
                <li key={r.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onPick(r)}
                    className={`min-w-0 flex-1 truncate rounded-lg px-2.5 py-1.5 text-left text-[11px] ${result?.id === r.id ? "bg-teal-950/60 text-teal-200" : "text-slate-300 hover:bg-slate-900"}`}
                  >
                    {r.title || "(제목 없음)"}
                  </button>
                  <button type="button" onClick={() => onDelete(r)} aria-label={`${r.title} 지우기`} className="rounded p-1 text-slate-600 hover:text-rose-300">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="pt-1 text-[10px] leading-snug text-slate-600">이 브라우저에만 보관합니다.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 px-5 py-3">
          <button type="button" disabled={!result || busy} onClick={() => result && onApply(result)} className={`${btn} bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-110`}>
            <Check className="h-4 w-4" /> 현재 가사 적용
          </button>
          <button type="button" disabled={!result || busy} onClick={() => result && onRefine(result)} className={`${btn} border border-teal-400/40 text-teal-200 hover:bg-teal-950/50`}>
            <Wand2 className="h-4 w-4" /> AI 수정
          </button>
          <button type="button" disabled={!result || busy} onClick={() => result && onRedo(result)} className={`${btn} border border-slate-700 text-slate-300 hover:bg-slate-900`}>
            <RefreshCw className="h-4 w-4" /> 삭제 후 새로 생성
          </button>
          <button type="button" onClick={onLater} className={`${btn} ml-auto text-slate-400 hover:text-slate-200`}>
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}
