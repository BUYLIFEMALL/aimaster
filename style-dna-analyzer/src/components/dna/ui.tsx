"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";
import { AI_ENGINES, defaultModel, type AiProvider } from "@/lib/ai/models";
import { useDna } from "./AnalysisProvider";

export const INPUT =
  "w-full rounded-xl border border-[#222d42] bg-[#0c0f17] px-3.5 py-2.5 text-sm text-[#f8fafc] placeholder-slate-500 focus:border-cyan-500 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20";
export const SELECT =
  "w-full rounded-xl border border-[#222d42] bg-[#0c0f17] px-3 py-2.5 text-sm text-[#f8fafc] focus:border-cyan-500 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20";
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all";
export const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#222d42] bg-[#182030] px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-[#222d42] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 transition-all";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#222d42] bg-[#131824] p-5 shadow-lg ${className}`}>{children}</section>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function StepHeader({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-violet-600 text-sm font-bold text-white shadow-md shadow-cyan-500/20">
          {step}
        </span>
        <h1 className="text-xl font-extrabold text-white tracking-tight">{title}</h1>
      </div>
      <p className="text-xs md:text-sm text-slate-400">{desc}</p>
    </div>
  );
}

export function ErrorNote({ message, needKey }: { message: string; needKey?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-rose-900/40 bg-rose-950/30 p-3.5 text-xs md:text-sm text-rose-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
      <div>
        <p className="font-semibold">{message}</p>
        {needKey && (
          <Link href="/settings" className="mt-1 inline-block font-bold text-rose-200 underline hover:text-white">
            API키등록·플랫폼연동으로 이동 →
          </Link>
        )}
      </div>
    </div>
  );
}

/** 분석·보정에 쓸 AI 선택(등록된 키가 있는 AI만 고를 수 있다) */
export function EnginePicker({ label = "분석 AI" }: { label?: string }) {
  const { engine, setEngine, keys } = useDna();
  const current = AI_ENGINES.find((e) => e.provider === engine.provider) ?? AI_ENGINES[0];
  const ready = keys ? keys[current.provider] : true;

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label={label}>
          <select
            className={SELECT}
            value={engine.provider}
            onChange={(e) =>
              setEngine({
                provider: e.target.value as AiProvider,
                model: defaultModel(e.target.value as AiProvider),
              })
            }
          >
            {AI_ENGINES.map((e) => (
              <option key={e.provider} value={e.provider} disabled={keys ? !keys[e.provider] : false} className="bg-[#131824] text-white">
                {e.label}
                {keys && !keys[e.provider] ? " (키 미등록)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="모델">
          <select
            className={SELECT}
            value={engine.model}
            onChange={(e) => setEngine({ ...engine, model: e.target.value })}
          >
            {current.models.map((m) => (
              <option key={m.value} value={m.value} className="bg-[#131824] text-white">
                {m.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {keys && !ready && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-300">
          선택한 AI의 API 키가 등록되지 않았습니다.{" "}
          <Link href="/settings" className="font-bold underline text-amber-200 hover:text-white">
            API키등록·플랫폼연동
          </Link>
          에서 본인 키를 등록하거나 키가 있는 AI를 선택해주세요.
        </div>
      )}
      <p className="text-[11px] text-slate-400">회원님 본인의 AI 키로 호출되며 요금은 해당 AI 계정에 직접 청구됩니다.</p>
    </div>
  );
}

/** 분석이 아직 없을 때 보여 주는 안내 */
export function NeedAnalysis({ children }: { children: ReactNode }) {
  return (
    <Card className="space-y-3">
      <p className="text-sm text-slate-300 leading-relaxed">{children}</p>
      <div className="flex flex-wrap gap-2.5 pt-1">
        <Link href="/analyze" className={BTN_PRIMARY}>
          1단계 이미지 분석으로 이동
        </Link>
        <Link href="/dashboard" className={BTN_GHOST}>
          보관함에서 불러오기
        </Link>
      </div>
    </Card>
  );
}

export function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* 클립보드 권한이 없으면 무시 */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#222d42] bg-[#182030] px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-[#222d42] hover:text-white transition-colors"
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}{" "}
      {done ? "복사됨" : label}
    </button>
  );
}
