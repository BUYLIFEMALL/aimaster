"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  AI_MODEL_OPTIONS,
  AI_PROVIDERS,
  DEFAULT_AI_MODELS,
  PROVIDER_ICONS,
  PROVIDER_SHORT_LABELS,
} from "@/lib/ai/models";
import { useStudio } from "@/components/studio/StudioProvider";

export function StepHeader({
  step,
  title,
  desc,
}: {
  step: number;
  title: string;
  desc: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white shadow-sm shadow-rose-900/40">
          {step}
        </span>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#f0f6fc]">{title}</h1>
      </div>
      <p className="mt-2 text-sm text-[#8b949e]">{desc}</p>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#30363d] bg-[#161b22] p-5 shadow-sm md:p-6 text-[#c9d1d9] ${className}`}>
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-700 active:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40 shadow-sm shadow-rose-950/50 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border border-[#30363d] bg-[#21262d] px-4 py-2.5 text-sm font-semibold text-[#c9d1d9] transition-colors hover:bg-[#30363d] hover:text-[#f0f6fc] active:bg-[#373e47] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function LoadingCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#30363d] border-t-rose-500" />
        <div>
          <div className="text-sm font-bold text-[#f0f6fc]">{title}</div>
          <div className="mt-0.5 text-xs text-[#8b949e]">{desc}</div>
        </div>
      </div>
    </Card>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-sm font-medium text-rose-300">
      {message}
    </div>
  );
}

export function NeedPrevious({ message, href, label }: { message: string; href: string; label: string }) {
  return (
    <Card>
      <p className="text-sm text-[#8b949e]">{message}</p>
      <Link
        href={href}
        className="mt-3 inline-block rounded-xl border border-[#30363d] bg-[#21262d] px-4 py-2 text-sm font-bold text-[#f0f6fc] hover:bg-[#30363d]"
      >
        {label}
      </Link>
    </Card>
  );
}

/** AI 엔진·모델 선택 (GPT / Claude / Gemini) */
export function ModelPicker({ hint }: { hint?: string }) {
  const { model, setModel } = useStudio();
  const options = AI_MODEL_OPTIONS.filter((m) => m.provider === model.provider);

  return (
    <Card className="bg-[#161b22] border-[#30363d]">
      <div className="mb-2 text-xs font-bold text-[#c9d1d9]">
        🤖 AI 엔진 · {AI_MODEL_OPTIONS.find((m) => m.value === model.model)?.shortLabel ?? model.model}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex gap-1.5">
          {AI_PROVIDERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setModel({ provider: p, model: DEFAULT_AI_MODELS[p] })}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                model.provider === p
                  ? "bg-rose-600 text-white shadow-sm shadow-rose-900/40"
                  : "border border-[#30363d] bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#f0f6fc]"
              }`}
            >
              {PROVIDER_ICONS[p]} {PROVIDER_SHORT_LABELS[p]}
            </button>
          ))}
        </div>
        <select
          value={model.model}
          onChange={(e) => setModel({ provider: model.provider, model: e.target.value })}
          className="min-w-0 flex-1 rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-xs text-[#f0f6fc] focus:border-rose-500 focus:outline-none"
        >
          {options.map((m) => (
            <option key={m.value} value={m.value} className="bg-[#161b22] text-[#f0f6fc]">
              {m.label}
            </option>
          ))}
        </select>
      </div>
      {hint && <p className="mt-2 text-[11px] leading-relaxed text-[#8b949e]">{hint}</p>}
    </Card>
  );
}

export function SaveStatus() {
  const { saveState, saveError } = useStudio();
  if (saveState === "idle") return null;
  if (saveState === "saving") return <span className="text-xs text-[#8b949e]">저장 중…</span>;
  if (saveState === "saved") return <span className="text-xs text-emerald-400 font-semibold">✓ 프로젝트에 저장됨</span>;
  return <span className="text-xs text-rose-400 font-semibold">저장 실패: {saveError}</span>;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

/** 프롬프트 박스 + 복사 버튼 (프롬프트 화면·보관함 공통) */
export function CopyBox({ label, text, tone }: { label: string; text: string; tone: "dark" | "green" | "rose" }) {
  const [copied, setCopied] = useState(false);
  const badge =
    tone === "dark"
      ? "bg-[#21262d] text-[#f0f6fc] border border-[#30363d]"
      : tone === "green"
      ? "bg-emerald-600 text-white"
      : "bg-rose-600 text-white";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className={`rounded px-2 py-0.5 text-[11px] font-extrabold ${badge}`}>{label}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              // 클립보드 권한이 없으면 직접 선택해서 복사하도록 둡니다.
            }
          }}
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            copied ? "border-emerald-500 text-emerald-400 bg-emerald-950/30" : "border-[#30363d] bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#f0f6fc]"
          }`}
        >
          {copied ? "복사됨!" : "복사"}
        </button>
      </div>
      <div className="whitespace-pre-wrap break-words rounded-lg border border-[#30363d] bg-[#0d1117] p-3 font-mono text-xs leading-relaxed text-[#c9d1d9]">
        {text}
      </div>
    </div>
  );
}
