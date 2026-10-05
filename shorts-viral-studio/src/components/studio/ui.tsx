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
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white">
          {step}
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{title}</h1>
      </div>
      <p className="mt-2 text-sm text-neutral-500">{desc}</p>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs md:p-6 ${className}`}>
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
      className={`rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
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
      className={`rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function LoadingCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-rose-200 border-t-rose-600" />
        <div>
          <div className="text-sm font-bold text-neutral-900">{title}</div>
          <div className="mt-0.5 text-xs text-neutral-500">{desc}</div>
        </div>
      </div>
    </Card>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">{message}</div>
  );
}

export function NeedPrevious({ message, href, label }: { message: string; href: string; label: string }) {
  return (
    <Card>
      <p className="text-sm text-neutral-600">{message}</p>
      <Link
        href={href}
        className="mt-3 inline-block rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:bg-black"
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
    <Card className="bg-neutral-50/60">
      <div className="mb-2 text-xs font-bold text-neutral-700">
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
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {PROVIDER_ICONS[p]} {PROVIDER_SHORT_LABELS[p]}
            </button>
          ))}
        </div>
        <select
          value={model.model}
          onChange={(e) => setModel({ provider: model.provider, model: e.target.value })}
          className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 focus:border-neutral-900 focus:outline-none"
        >
          {options.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      {hint && <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">{hint}</p>}
    </Card>
  );
}

export function SaveStatus() {
  const { saveState, saveError } = useStudio();
  if (saveState === "idle") return null;
  if (saveState === "saving") return <span className="text-xs text-neutral-400">저장 중…</span>;
  if (saveState === "saved") return <span className="text-xs text-emerald-600">✓ 프로젝트에 저장됨</span>;
  return <span className="text-xs text-rose-600">저장 실패: {saveError}</span>;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

/** 프롬프트 박스 + 복사 버튼 (프롬프트 화면·보관함 공통) */
export function CopyBox({ label, text, tone }: { label: string; text: string; tone: "dark" | "green" | "rose" }) {
  const [copied, setCopied] = useState(false);
  const badge =
    tone === "dark" ? "bg-neutral-900 text-white" : tone === "green" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white";
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
            copied ? "border-emerald-500 text-emerald-600" : "border-neutral-200 text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          {copied ? "복사됨!" : "복사"}
        </button>
      </div>
      <div className="whitespace-pre-wrap break-words rounded-lg border border-neutral-200 bg-white p-3 font-mono text-xs leading-relaxed text-neutral-800">
        {text}
      </div>
    </div>
  );
}
