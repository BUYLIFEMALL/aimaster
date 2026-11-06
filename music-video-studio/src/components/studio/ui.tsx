"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

export const INPUT =
  "w-full rounded-xl border border-slate-700/80 bg-[#070a14] px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50 transition-all";
export const SELECT = INPUT;

export const BTN_PRIMARY =
  "btn-3d-magenta inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40";

export const BTN_AMBER =
  "btn-3d-amber inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40";

export const BTN_CYAN =
  "btn-3d-cyan inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40";

export const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-700/80 bg-[#0f1424] px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-[#182038] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-800 bg-[#0c1020]/90 p-5 shadow-xl ${className}`}>{children}</section>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-200">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function StepHeader({
  step,
  title,
  desc,
  actions,
}: {
  step: number | string;
  title: string;
  desc: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider border border-rose-500/30">
            {step}
          </span>
          <span className="text-[10px] font-bold text-amber-400">시네마틱 네온 MV 스튜디오</span>
        </div>
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-slate-400">{desc}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function ErrorNote({ message, needKey }: { message?: string; needKey?: boolean }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
      <div className="space-y-1">
        <p className="font-bold">{message}</p>
        <p className="text-[11px] text-rose-300/80">
          API 키가 없거나 사용량이 만료된 경우{" "}
          <Link href="/settings" className="underline hover:text-white font-bold">
            설정 화면
          </Link>
          에서 확인하세요.
        </p>
      </div>
    </div>
  );
}

export function NeedStep({ children, href, label }: { children: React.ReactNode; href: string; label: string }) {
  return (
    <Card className="text-center py-10">
      <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">{children}</p>
      <Link href={href} className={`${BTN_PRIMARY} mt-4`}>
        {label}
      </Link>
    </Card>
  );
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
