"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

export const INPUT =
  "w-full rounded-xl border border-[#1e293b] bg-[#080c14] px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all";
export const SELECT = INPUT;
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-40 transition-all";
export const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#1e293b] bg-[#0e1424] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-[#162032] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#1e293b] bg-[#0e1424] p-5 shadow-sm ${className}`}>{children}</section>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-200">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400 leading-normal">{hint}</span>}
    </label>
  );
}

export function StepHeader({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 text-xs font-mono font-bold text-white shadow-md shadow-cyan-500/25 ring-2 ring-cyan-400/30">
          0{step}
        </span>
        <h1 className="text-xl font-extrabold text-white tracking-tight">{title}</h1>
      </div>
      <p className="mt-1.5 text-xs text-slate-400 pl-11">{desc}</p>
    </div>
  );
}

export function ErrorNote({ message, needKey }: { message: string; needKey?: boolean }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-900/50 bg-rose-950/40 p-3.5 text-xs text-rose-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
      <span className="leading-relaxed">
        {message}
        {needKey && (
          <>
            {" "}
            <Link href="/settings" className="font-bold underline text-cyan-300 hover:text-cyan-200 ml-1">
              🔑 API키등록·플랫폼연동으로 이동 &rarr;
            </Link>
          </>
        )}
      </span>
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

/** 클립보드 복사 버튼용 간단 도우미 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
