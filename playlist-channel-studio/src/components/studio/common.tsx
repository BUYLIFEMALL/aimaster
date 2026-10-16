"use client";

import { useState } from "react";
import { Check, Copy, Loader2, RotateCcw, Zap } from "lucide-react";
import { IMAGE_MODELS, PROVIDER_LABELS, TEXT_MODELS, imageModelById, textModelById, type Provider } from "@/lib/playlist/types";
import { useAi } from "./useAi";

export function CopyButton({ text, label = "복사", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          window.prompt("복사하지 못했습니다. 아래 내용을 직접 복사해 주세요.", text);
        }
      }}
      className={`inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors ${className}`}
    >
      {done ? <Check size={13} className="text-cyan-400" /> : <Copy size={13} />}
      {done ? "복사됨" : label}
    </button>
  );
}

export function PrimaryButton({ busy, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={busy || rest.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:shadow-[0_0_22px_rgba(6,182,212,0.5)] transition-all disabled:opacity-50 disabled:shadow-none ${rest.className ?? ""}`}
    >
      {busy && <Loader2 size={16} className="animate-spin text-slate-950" />}
      {children}
    </button>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">{message}</p>;
}

/** 텍스트·이미지 모델 선택 + 이 브라우저의 사용량 요약 */
export function ModelBar() {
  const { textModel, imageModel, setTextModel, setImageModel, usage, clearUsage } = useAi();
  const [open, setOpen] = useState(false);
  const total = usage.reduce((s, u) => s + u.cost, 0);
  const rate = 1450;
  const tm = textModelById(textModel);
  const im = imageModelById(imageModel);

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-4 text-slate-200 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-slate-400">
          텍스트 생성 모델 (제목·프롬프트·가사·설명)
          <select value={textModel} onChange={(e) => setTextModel(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-[#131b2e] px-2.5 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none">
            {TEXT_MODELS.map((m) => <option key={m.id} value={m.id} className="bg-[#131b2e] text-slate-100">{m.label}</option>)}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-400">
          이미지 생성 모델 (썸네일)
          <select value={imageModel} onChange={(e) => setImageModel(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-[#131b2e] px-2.5 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none">
            {IMAGE_MODELS.map((m) => <option key={m.id} value={m.id} className="bg-[#131b2e] text-slate-100">{m.label}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        선택한 모델은 회원님 본인의 {[...new Set([tm?.provider, im?.provider].filter(Boolean) as Provider[])].map((p) => PROVIDER_LABELS[p]).join("·")} 키로 호출됩니다.
      </p>
      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors">
        <Zap size={12} className="text-cyan-400" /> 이 브라우저의 사용량 {usage.length}건 · 예상 ${total.toFixed(4)} (약 {Math.round(total * rate).toLocaleString("ko-KR")}원)
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-slate-800 bg-[#060911] p-3 text-xs text-slate-300">
          <p className="mb-2 text-[11px] text-slate-500">호출 때 공급사가 알려준 토큰 수와 공개 단가로 계산한 예상값이며 실제 청구액과 다를 수 있습니다. 이 브라우저에만 저장됩니다.</p>
          {usage.length === 0 ? <p className="text-slate-400">아직 호출 기록이 없습니다.</p> : (
            <ul className="space-y-1">
              {usage.slice(-8).reverse().map((u, i) => (
                <li key={i} className="flex justify-between gap-2 border-b border-slate-800/60 pb-1 last:border-0 last:pb-0">
                  <span className="truncate font-mono text-cyan-300/80">{u.model}</span>
                  <span className="shrink-0 text-slate-400">{u.images ? `이미지 ${u.images}장` : `in ${u.inputTokens} / out ${u.outputTokens}`} · {(u.ms / 1000).toFixed(1)}초 · ${u.cost.toFixed(4)}</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={clearUsage} className="mt-2.5 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors"><RotateCcw size={11} /> 기록 지우기</button>
        </div>
      )}
    </div>
  );
}
