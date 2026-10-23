"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { AI_ENGINES, defaultModel, type AiProvider } from "@/lib/cardnews/ai/models";
import { useStudio, type SaveStatus } from "./ProjectProvider";

export const INPUT = "w-full rounded-xl border border-[#262c3d] bg-[#0d0f17] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500";
export const SELECT = "w-full rounded-xl border border-[#262c3d] bg-[#0d0f17] px-3 py-2.5 text-sm text-slate-100 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500";
export const BTN_PRIMARY = "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-pink-500/20 hover:opacity-95 transition-opacity disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_GHOST = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#262c3d] bg-[#161922] px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-[#1e2230] hover:text-slate-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#262c3d] bg-[#161922] p-5 shadow-lg shadow-black/20 text-slate-200 ${className}`}>{children}</section>;
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

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: "",
  dirty: "저장 대기 중…",
  saving: "저장 중…",
  saved: "자동 저장됨",
  error: "저장 실패",
};

export function SaveBadge() {
  const { status, saveError, saveNow } = useStudio();
  if (status === "idle") return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${status === "error" ? "text-red-400" : "text-slate-400"}`} title={saveError ?? undefined}>
      {status === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />}
      {status === "saved" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
      {status === "error" && <AlertCircle className="h-3.5 w-3.5" />}
      {STATUS_TEXT[status]}
      {status === "error" && (
        <button type="button" onClick={() => void saveNow()} className="font-bold underline text-red-400 ml-1">
          다시 시도
        </button>
      )}
    </span>
  );
}

export function StepHeader({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-sm font-bold text-white shadow-md shadow-pink-500/20">{step}</span>
          <h1 className="text-xl font-bold text-slate-100">{title}</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">{desc}</p>
      </div>
      <SaveBadge />
    </div>
  );
}

export function ErrorNote({ message, needKey }: { message: string; needKey?: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
      <div>
        <p>{message}</p>
        {needKey && (
          <Link href="/cardnews/settings" className="mt-1 inline-block font-bold underline text-red-400 hover:text-red-300">
            API키등록·플랫폼연동으로 이동
          </Link>
        )}
      </div>
    </div>
  );
}

/** 문구 기획에 쓸 글쓰기 AI 선택(등록된 키가 있는 AI만 고를 수 있다) */
export function EnginePicker() {
  const { project, update, keys } = useStudio();
  const engine = AI_ENGINES.find((e) => e.provider === project.engine.provider) ?? AI_ENGINES[0];
  const registered = keys;
  const selectedReady = registered ? registered[engine.provider] : true;

  const setProvider = (p: AiProvider) => update((d) => ({ ...d, engine: { provider: p, model: defaultModel(p) } }));
  const setModel = (m: string) => update((d) => ({ ...d, engine: { ...d.engine, model: m } }));

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="글쓰기 AI">
          <select className={SELECT} value={engine.provider} onChange={(e) => setProvider(e.target.value as AiProvider)}>
            {AI_ENGINES.map((e) => (
              <option key={e.provider} value={e.provider} disabled={registered ? !registered[e.provider] : false} className="bg-[#161922] text-slate-100">
                {e.label}
                {registered && !registered[e.provider] ? " (키 미등록)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="모델">
          <select className={SELECT} value={project.engine.model} onChange={(e) => setModel(e.target.value)}>
            {engine.models.map((m) => (
              <option key={m.value} value={m.value} className="bg-[#161922] text-slate-100">
                {m.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {registered && !selectedReady && (
        <p className="text-xs text-amber-300">
          선택한 AI의 API 키가 없습니다.{" "}
          <Link href="/cardnews/settings" className="font-bold underline text-amber-400">
            API키등록·플랫폼연동
          </Link>
          에서 본인 키를 등록하거나 키가 있는 AI를 선택해주세요.
        </p>
      )}
      <p className="text-[11px] text-slate-400">회원님 본인의 AI 키로 호출되며 요금은 해당 AI 계정에 청구됩니다.</p>
    </div>
  );
}

/** 프로젝트가 비어 있을 때 보여 주는 안내 */
export function NeedPlan({ children }: { children: ReactNode }) {
  return (
    <Card>
      <p className="text-sm text-slate-300">{children}</p>
      <Link href="/cardnews/plan" className={`${BTN_PRIMARY} mt-3`}>
        1단계 기획으로 이동
      </Link>
    </Card>
  );
}
