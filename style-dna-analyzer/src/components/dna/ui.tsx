"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";
import { AI_ENGINES, defaultModel, type AiProvider } from "@/lib/ai/models";
import { useDna } from "./AnalysisProvider";

export const INPUT = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500";
export const SELECT = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500";
export const BTN_PRIMARY = "inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_GHOST = "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-xs ${className}`}>{children}</section>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gray-500">{hint}</span>}
    </label>
  );
}

export function StepHeader({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">{step}</span>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>
      <p className="mt-1 text-sm text-gray-500">{desc}</p>
    </div>
  );
}

export function ErrorNote({ message, needKey }: { message: string; needKey?: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
      <div>
        <p>{message}</p>
        {needKey && (
          <Link href="/settings" className="mt-1 inline-block font-bold underline">
            API키등록·플랫폼연동으로 이동
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
          <select className={SELECT} value={engine.provider} onChange={(e) => setEngine({ provider: e.target.value as AiProvider, model: defaultModel(e.target.value as AiProvider) })}>
            {AI_ENGINES.map((e) => (
              <option key={e.provider} value={e.provider} disabled={keys ? !keys[e.provider] : false}>
                {e.label}
                {keys && !keys[e.provider] ? " (키 미등록)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="모델">
          <select className={SELECT} value={engine.model} onChange={(e) => setEngine({ ...engine, model: e.target.value })}>
            {current.models.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {keys && !ready && (
        <p className="text-xs text-amber-800">
          선택한 AI의 API 키가 없습니다.{" "}
          <Link href="/settings" className="font-bold underline">
            API키등록·플랫폼연동
          </Link>
          에서 본인 키를 등록하거나 키가 있는 AI를 선택해주세요.
        </p>
      )}
      <p className="text-[11px] text-gray-500">회원님 본인의 AI 키로 호출되며 요금은 해당 AI 계정에 청구됩니다.</p>
    </div>
  );
}

/** 분석이 아직 없을 때 보여 주는 안내 */
export function NeedAnalysis({ children }: { children: ReactNode }) {
  return (
    <Card>
      <p className="text-sm text-gray-600">{children}</p>
      <div className="mt-3 flex flex-wrap gap-2">
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
          /* 클립보드 권한이 없으면 아무 일도 하지 않는다 */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50"
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {done ? "복사됨" : label}
    </button>
  );
}
