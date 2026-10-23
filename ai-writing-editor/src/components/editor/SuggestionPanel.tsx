"use client";
import { useMemo, useState } from "react";
import { Check, Crosshair, Loader2, X } from "lucide-react";
import { SUGGESTION_CATEGORIES, type Suggestion, type SuggestionCategory } from "@/lib/we/types";

/** 전체 글 분석 결과 사이드바: 분류 필터, 제안별 [적용]·[본문에서 보기]·[무시], [모두 적용] */
export function SuggestionPanel({
  suggestions, analyzing, note, onApply, onApplyAll, onDismiss, onLocate, onClose, onRerun, hint,
}: {
  suggestions: Suggestion[];
  analyzing: boolean;
  note: string;
  onApply: (s: Suggestion) => void;
  onApplyAll: (list: Suggestion[]) => void;
  onDismiss: (s: Suggestion) => void;
  onLocate: (s: Suggestion) => void;
  onClose: () => void;
  onRerun: () => void;
  hint: string;
}) {
  const [filter, setFilter] = useState<SuggestionCategory | "all">("all");
  const shown = useMemo(() => (filter === "all" ? suggestions : suggestions.filter((s) => s.category === filter)), [suggestions, filter]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of suggestions) c[s.category] = (c[s.category] ?? 0) + 1;
    return c;
  }, [suggestions]);

  return (
    <aside className="we-panel" aria-label="글 분석 제안">
      <div className="we-panel-head">
        <h2>글 분석 {suggestions.length > 0 && <span className="we-count">{suggestions.length}</span>}</h2>
        <button type="button" aria-label="분석 패널 닫기" onClick={onClose}><X size={14} /></button>
      </div>
      {hint && <p className="muted we-panel-note">{hint}</p>}
      {analyzing ? (
        <p className="we-panel-loading" role="status"><Loader2 size={15} className="we-spin" /> AI가 글 전체를 검토하고 있습니다…</p>
      ) : (
        <>
          <div className="we-panel-tools">
            <div className="we-chips" role="group" aria-label="분류 필터">
              <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>전체 {suggestions.length}</button>
              {SUGGESTION_CATEGORIES.filter((c) => counts[c]).map((c) => (
                <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(c)}>{c} {counts[c]}</button>
              ))}
            </div>
            <div className="actions">
              <button type="button" className="primary" disabled={shown.length === 0} onClick={() => onApplyAll(shown)}>
                <Check size={13} />{filter === "all" ? "모두 적용" : `${filter} 모두 적용`}
              </button>
              <button type="button" onClick={onRerun}>다시 분석</button>
            </div>
          </div>
          {note && <p className="muted we-panel-note">{note}</p>}
          {suggestions.length === 0 ? (
            <p className="we-empty">{note ? "" : "고칠 곳을 찾지 못했습니다. 글이 이미 매끄럽습니다."}</p>
          ) : (
            <ul className="we-sug-list">
              {shown.map((s) => (
                <li key={s.originalText}>
                  <div className="we-sug-meta"><span className="we-cat">{s.category}</span><span className="muted">{s.reason}</span></div>
                  <p className="we-orig">{s.originalText}</p>
                  <p className="we-new">{s.suggestedText}</p>
                  <div className="actions">
                    <button type="button" className="primary" onClick={() => onApply(s)}>적용</button>
                    <button type="button" onClick={() => onLocate(s)}><Crosshair size={12} />본문에서 보기</button>
                    <button type="button" onClick={() => onDismiss(s)}>무시</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </aside>
  );
}
