"use client";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { LIBRARY, PROMPT_CATEGORIES, type PromptCategory } from "@/lib/kw/library";
import { fillTemplate } from "@/lib/kw/util";
import { CopyButton } from "./ResultView";

/** 프롬프트 50개 목록. 선택한 프롬프트를 [실행] 하거나 [복사]해서 다른 AI에 붙여 넣을 수 있다. */
export function PromptLibrary({ keyword, busy, onRun, onClose }: { keyword: string; busy: boolean; onRun: (promptId: string) => void; onClose: () => void }) {
  const [cat, setCat] = useState<PromptCategory>("research");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return LIBRARY.filter((p) => (t ? `${p.title} ${p.text}`.toLowerCase().includes(t) : p.category === cat));
  }, [cat, q]);

  return (
    <div className="kw-modal" role="dialog" aria-modal="true" aria-label="프롬프트 라이브러리">
      <div className="kw-modal-card">
        <div className="kw-modal-head">
          <h2>프롬프트 라이브러리 <small>50개</small></h2>
          <button type="button" aria-label="닫기" onClick={onClose}><X size={16} /></button>
        </div>
        <p className="muted">현재 키워드: <b>{keyword || "(키워드를 먼저 입력하세요)"}</b> — 프롬프트의 {"{keyword}"}에 자동으로 들어갑니다.</p>
        <div className="kw-lib-tools">
          <div className="kw-seg" role="tablist">
            {PROMPT_CATEGORIES.map((c) => (
              <button key={c.id} type="button" role="tab" aria-pressed={!q && cat === c.id} onClick={() => { setQ(""); setCat(c.id); }}>{c.title}</button>
            ))}
          </div>
          <label className="kw-search"><Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="프롬프트 검색" /></label>
        </div>
        <ul className="kw-lib">
          {list.map((p) => {
            const text = fillTemplate(p.text, { keyword: keyword || "{keyword}" });
            return (
              <li key={p.id}>
                <strong>{p.title}</strong>
                <p>{text}</p>
                <div className="actions">
                  <button type="button" className="primary" disabled={busy || !keyword} onClick={() => onRun(p.id)}>실행</button>
                  <CopyButton text={text} label="프롬프트 복사" />
                </div>
              </li>
            );
          })}
          {list.length === 0 && <li className="kw-empty">검색 결과가 없습니다.</li>}
        </ul>
      </div>
    </div>
  );
}
