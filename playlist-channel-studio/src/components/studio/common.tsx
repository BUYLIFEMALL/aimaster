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
      className={`inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 ${className}`}
    >
      {done ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 ${rest.className ?? ""}`}
    >
      {busy && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p>;
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
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-neutral-500">
          텍스트 생성 모델 (제목·프롬프트·가사·설명)
          <select value={textModel} onChange={(e) => setTextModel(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-sm text-neutral-900">
            {TEXT_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <label className="block text-xs font-medium text-neutral-500">
          이미지 생성 모델 (썸네일)
          <select value={imageModel} onChange={(e) => setImageModel(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-sm text-neutral-900">
            {IMAGE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-2 text-[11px] text-neutral-400">
        선택한 모델은 회원님 본인의 {[...new Set([tm?.provider, im?.provider].filter(Boolean) as Provider[])].map((p) => PROVIDER_LABELS[p]).join("·")} 키로 호출됩니다.
      </p>
      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800">
        <Zap size={12} /> 이 브라우저의 사용량 {usage.length}건 · 예상 ${total.toFixed(4)} (약 {Math.round(total * rate).toLocaleString("ko-KR")}원)
      </button>
      {open && (
        <div className="mt-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
          <p className="mb-2 text-[11px] text-neutral-400">호출 때 공급사가 알려준 토큰 수와 공개 단가로 계산한 예상값이며 실제 청구액과 다를 수 있습니다. 이 브라우저에만 저장됩니다.</p>
          {usage.length === 0 ? <p>아직 호출 기록이 없습니다.</p> : (
            <ul className="space-y-1">
              {usage.slice(-8).reverse().map((u, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate font-mono">{u.model}</span>
                  <span className="shrink-0">{u.images ? `이미지 ${u.images}장` : `in ${u.inputTokens} / out ${u.outputTokens}`} · {(u.ms / 1000).toFixed(1)}초 · ${u.cost.toFixed(4)}</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={clearUsage} className="mt-2 inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-rose-600"><RotateCcw size={11} /> 기록 지우기</button>
        </div>
      )}
    </div>
  );
}
