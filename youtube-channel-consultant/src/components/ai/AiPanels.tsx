"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Loader2, Sparkles, X } from "lucide-react";
import { AI_ENGINES, type AiProvider } from "@/lib/ai/models";
import { Markdown } from "./Markdown";
import type { AiRunState, useAiEngine } from "./useAi";

type EngineState = ReturnType<typeof useAiEngine>;

const SELECT = "rounded-lg border border-yt-border bg-yt-surface px-2.5 py-1.5 text-xs font-medium text-yt-text focus:outline-hidden focus:ring-2 focus:ring-yt-red";

/** AI 분석에 쓸 AI·모델 선택 + 실행 버튼 묶음 */
export function AiEngineBar({
  engine,
  actions,
}: {
  engine: EngineState;
  actions: { label: string; onClick: () => void }[];
}) {
  const { registered, provider, model, setProvider, setModel, ready } = engine;
  const current = AI_ENGINES.find((e) => e.provider === provider)!;

  return (
    <section className="rounded-2xl border border-yt-violet/40 bg-yt-violet/15/50 p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-yt-violet">
          <Sparkles size={15} /> AI 분석
        </span>
        <select className={SELECT} value={provider} onChange={(e) => setProvider(e.target.value as AiProvider)} aria-label="AI 선택">
          {AI_ENGINES.map((e) => (
            <option key={e.provider} value={e.provider} disabled={registered ? !registered[e.provider] : false}>
              {e.label}
              {registered && !registered[e.provider] ? " (키 미등록)" : ""}
            </option>
          ))}
        </select>
        <select className={SELECT} value={model} onChange={(e) => setModel(e.target.value)} aria-label="모델 선택">
          {current.models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <div className="ml-auto flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={!ready}
              onClick={a.onClick}
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
      {registered && !ready ? (
        <p className="mt-2 text-xs text-yt-violet">
          선택한 AI의 API 키가 없습니다.{" "}
          <Link href="/settings" className="font-bold underline">
            API키등록·플랫폼연동
          </Link>
          에서 본인 키를 등록하면 사용할 수 있습니다.
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-yt-muted">
          회원님 본인의 AI 키로 호출되며, 요금은 해당 AI 계정에 청구됩니다. 분석은 이미 조회한 데이터만 근거로 하고, 없는 정보는 &quot;확인 불가&quot;로 표시합니다.
          {current.watchesVideo ? " Gemini는 영상 요약 때 영상을 직접 봅니다(15분 이하)." : " 이 AI는 영상을 직접 볼 수 없어 영상 요약은 제목·설명·지표 기반 추정입니다."}
        </p>
      )}
    </section>
  );
}

/** AI 분석 결과를 오른쪽에 띄우는 서랍 */
export function AiDrawer({ state, onClose }: { state: AiRunState; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!state.open) return null;

  const copy = async () => {
    if (!state.result) return;
    try {
      await navigator.clipboard.writeText(state.result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 복사 권한이 없으면 무시 */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside className="flex h-full w-full flex-col bg-yt-surface shadow-xl sm:w-[520px]" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 border-b border-yt-border p-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-yt-text">
              <Sparkles size={15} className="text-yt-violet" /> {state.title}
            </h3>
            {state.result && (
              <p className="mt-0.5 text-[11px] text-yt-muted">
                {state.result.providerLabel} · {state.result.model}
                {state.result.type === "video-summary" && (state.result.mode === "direct-video" ? " · 영상을 직접 보고 분석" : " · 영상을 직접 보지 않은 추정")}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-lg p-1.5 text-yt-muted hover:bg-yt-hover">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">
          {state.loading && (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-yt-muted">
              <Loader2 className="h-5 w-5 animate-spin" /> AI가 분석하는 중입니다. 잠시만 기다려주세요...
            </div>
          )}
          {state.error && (
            <div className="rounded-xl border border-yt-red/40 bg-yt-red/10 p-4 text-sm text-yt-danger">
              <p>{state.error}</p>
              {state.needApiKey && (
                <Link href="/settings" className="mt-1 inline-block font-bold underline">
                  API키등록·플랫폼연동으로 이동
                </Link>
              )}
            </div>
          )}
          {state.result && <Markdown text={state.result.text} />}
        </div>
        {state.result && (
          <footer className="flex items-center justify-between gap-2 border-t border-yt-border p-3">
            <p className="text-[11px] text-yt-muted">AI 분석은 참고용입니다. 중요한 결정 전에 원본 데이터를 함께 확인하세요.</p>
            <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-yt-border px-3 py-1.5 text-xs font-bold text-yt-text hover:bg-yt-hover">
              <Copy size={13} /> {copied ? "복사됨" : "복사"}
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
