"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Copy, FileUp, FlaskConical, Loader2, Save, Undo2, Wand2 } from "lucide-react";
import { LIMITS, type Lang } from "@/lib/persona/types";
import { getSamples } from "@/lib/persona/data";
import { STRINGS } from "./i18n";

/** 장식용 이퀄라이저 막대: 값(창의성)에 따라 높이가 살짝 흔들린다 */
function Bars({ creativity, busy }: { creativity: number; busy: boolean }) {
  const [h, setH] = useState([16, 32, 48, 24, 40, 16, 48, 24, 32]);
  useEffect(() => {
    const id = setInterval(() => setH((prev) => prev.map(() => Math.floor(Math.random() * 30) + 10 + creativity / 5)), busy ? 120 : 300);
    return () => clearInterval(id);
  }, [creativity, busy]);
  return (
    <div className="pointer-events-none mt-4 flex h-20 items-end justify-center gap-1.5 pb-4" aria-hidden>
      {h.map((v, i) => (
        <div key={i} className={`w-1.5 rounded-full transition-all duration-300 ${i % 2 === 0 ? "bg-violet-300" : "bg-cyan-200"}`} style={{ height: v, opacity: 0.8 }} />
      ))}
    </div>
  );
}

export function CanvasPanel({
  lang,
  text,
  setText,
  creativity,
  busy,
  canUndo,
  onGenerate,
  onUndo,
  onSaveDraft,
  onOpenLoad,
  onCopy,
  copied,
}: {
  lang: Lang;
  text: string;
  setText: (s: string) => void;
  creativity: number;
  busy: boolean;
  canUndo: boolean;
  onGenerate: () => void;
  onUndo: () => void;
  onSaveDraft: () => void;
  onOpenLoad: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const t = STRINGS[lang];
  const [sampleOpen, setSampleOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const samples = useMemo(() => getSamples(lang), [lang]);

  useEffect(() => {
    const close = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setSampleOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const btn = "flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50";

  return (
    <section className="relative flex min-h-[34rem] flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-6">
      <div className="relative z-30 mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.canvasTitle}</h2>
          <p className="text-sm text-slate-500">{t.canvasDesc}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div ref={wrap} className="relative">
            <button type="button" onClick={() => setSampleOpen((v) => !v)} className={`${btn} text-violet-700 ${sampleOpen ? "border-violet-600 ring-2 ring-violet-100" : ""}`}>
              <FlaskConical size={16} />
              {t.loadSample}
              <ChevronDown size={14} />
            </button>
            {sampleOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
                <div className="border-b border-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.selectGenre}</div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {samples.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        setText(s.text);
                        setSampleOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-violet-400" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button type="button" onClick={onOpenLoad} className={btn}>
            <FileUp size={16} />
            {t.load}
          </button>
          <button type="button" onClick={onCopy} className={btn}>
            <Copy size={16} />
            {copied ? t.copied : t.copy}
          </button>
          <button type="button" onClick={onSaveDraft} className={btn}>
            <Save size={16} />
            {t.saveDraft}
          </button>
        </div>
      </div>

      <div className="relative z-10 mb-20 flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg shadow-slate-200/50">
        <div className="relative flex flex-1 flex-col p-5 sm:p-8">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, LIMITS.text))}
            placeholder={t.placeholder}
            className="min-h-[16rem] w-full flex-1 resize-none bg-transparent text-lg font-light leading-relaxed text-slate-700 outline-none placeholder:text-slate-300"
          />
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {text.length.toLocaleString()} / {LIMITS.text.toLocaleString()}
            </span>
            {canUndo && (
              <button type="button" onClick={onUndo} className="flex items-center gap-1 rounded-md px-2 py-1 font-bold text-violet-700 hover:bg-violet-50">
                <Undo2 size={13} />
                {t.undo}
              </button>
            )}
          </div>
          <Bars creativity={creativity} busy={busy} />
        </div>
        <div className="h-1.5 w-full bg-gradient-to-r from-violet-600 to-cyan-400" />
      </div>

      <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center">
        <button
          type="button"
          onClick={onGenerate}
          disabled={busy || !text.trim()}
          className="group flex items-center gap-4 rounded-2xl bg-violet-600 py-2.5 pl-8 pr-3 text-white shadow-xl shadow-violet-600/30 transition hover:bg-violet-700 active:scale-95 disabled:bg-slate-400 disabled:shadow-none"
        >
          <span className="py-1.5 text-lg font-black tracking-widest">{busy ? t.generating : t.generate}</span>
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/20 transition group-hover:rotate-12">
            {busy ? <Loader2 size={22} className="animate-spin" /> : <Wand2 size={22} />}
          </span>
        </button>
      </div>
    </section>
  );
}
