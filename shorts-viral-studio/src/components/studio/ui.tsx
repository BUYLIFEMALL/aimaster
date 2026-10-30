"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  AI_MODEL_OPTIONS,
  AI_PROVIDERS,
  DEFAULT_AI_MODELS,
  PROVIDER_ICONS,
  PROVIDER_SHORT_LABELS,
  type AIModelProvider,
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
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white shadow-md shadow-red-500/30">
          {step}
        </span>
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">{title}</h1>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-500">{desc}</p>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 text-slate-800 ${className}`}>
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
      className={`btn-3d-yt-red px-5 py-2.5 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
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
      className={`btn-3d-slate px-4 py-2.5 text-sm font-bold text-slate-700 transition-all disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function LoadingCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-red-600" />
        <div>
          <div className="text-sm font-bold text-slate-900">{title}</div>
          <div className="mt-0.5 text-xs text-slate-500">{desc}</div>
        </div>
      </div>
    </Card>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
      {message}
    </div>
  );
}

export function SuccessBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
      {message}
    </div>
  );
}

export function EmptyState({
  icon = "🔎",
  title,
  desc,
  action,
}: {
  icon?: string;
  title: string;
  desc: string;
  action?: ReactNode;
}) {
  return (
    <Card className="text-center py-10">
      <div className="text-4xl">{icon}</div>
      <div className="mt-3 text-base font-bold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{desc}</div>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export function Badge({
  variant = "default",
  children,
}: {
  variant?: "default" | "success" | "warning" | "danger" | "brand";
  children: ReactNode;
}) {
  const styles: Record<string, string> = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    brand: "bg-red-50 text-red-600 border-red-200 font-black",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        styles[variant] ?? styles.default
      }`}
    >
      {children}
    </span>
  );
}

export function SaveStatus() {
  const { saveState, saveError } = useStudio();
  if (saveState === "saving") {
    return <span className="text-xs font-bold text-red-600">저장 중…</span>;
  }
  if (saveState === "error") {
    return <span className="text-xs font-bold text-red-600" title={saveError ?? ""}>저장 실패</span>;
  }
  if (saveState === "saved") {
    return <span className="text-xs font-medium text-slate-400">저장됨</span>;
  }
  return null;
}

export function NeedPrevious({
  message,
  href,
  label,
}: {
  message: string;
  href: string;
  label: string;
}) {
  return (
    <Card className="text-center py-8">
      <p className="text-sm text-slate-600 font-medium">{message}</p>
      <div className="mt-4">
        <Link href={href} className="btn-3d-yt-red px-4 py-2 text-xs font-bold text-white">
          {label}
        </Link>
      </div>
    </Card>
  );
}

export function CopyBox({
  text,
  label,
  tone,
}: {
  text: string;
  label?: string;
  tone?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-2xs">
      <div className="flex items-center justify-between mb-1">
        {label && <div className="text-[11px] font-bold text-slate-500">{label}</div>}
        {tone && <div className="text-[10px] font-semibold text-slate-400">{tone}</div>}
      </div>
      <div className="text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-wrap break-all pr-14">
        {text}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 shadow-2xs"
      >
        {copied ? "✓ 복사됨" : "복사"}
      </button>
    </div>
  );
}

export function ModelPicker({ hint }: { hint?: string }) {
  const { model, setModel } = useStudio();
  const [open, setOpen] = useState(false);

  const currentProvider = model.provider as AIModelProvider;
  const filteredModels = AI_MODEL_OPTIONS.filter((m) => m.provider === currentProvider);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <span className="text-sm">{PROVIDER_ICONS[currentProvider]}</span>
          <span>분석 엔진:</span>
          <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 font-black text-red-600 shadow-xs">
            {PROVIDER_SHORT_LABELS[currentProvider]} · {model.model}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-xs font-bold text-slate-500 hover:text-red-600"
        >
          {open ? "닫기 ▲" : "엔진 변경 ▼"}
        </button>
      </div>

      {hint && !open && (
        <p className="mt-2 text-[11px] text-slate-500 font-medium leading-relaxed">{hint}</p>
      )}

      {open && (
        <div className="mt-3 space-y-2.5 border-t border-slate-200 pt-3">
          <div className="grid grid-cols-3 gap-2">
            {AI_PROVIDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setModel({ provider: p, model: DEFAULT_AI_MODELS[p] })}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                  currentProvider === p
                    ? "border-red-500 bg-white text-red-600 shadow-sm ring-1 ring-red-500"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div>{PROVIDER_ICONS[p]}</div>
                <div className="mt-1">{PROVIDER_SHORT_LABELS[p]}</div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {filteredModels.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setModel({ provider: currentProvider, model: m.value })}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  model.model === m.value
                    ? "border-red-400 bg-red-50 text-red-700 font-bold"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {m.shortLabel || m.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EngineSelector() {
  return <ModelPicker />;
}
