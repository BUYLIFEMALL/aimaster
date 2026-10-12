"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

export const INPUT =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400";
export const SELECT = INPUT;
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-xs ${className}`}>{children}</section>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gray-500">{hint}</span>}
    </label>
  );
}

export function StepHeader({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white">{step}</span>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>
      <p className="mt-1.5 text-sm text-gray-500">{desc}</p>
    </div>
  );
}

export function ErrorNote({ message, needKey }: { message: string; needKey?: boolean }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {message}
        {needKey && (
          <>
            {" "}
            <Link href="/settings" className="font-bold underline">
              API키등록·플랫폼연동으로 이동
            </Link>
          </>
        )}
      </span>
    </div>
  );
}

export function NeedStep({ children, href, label }: { children: React.ReactNode; href: string; label: string }) {
  return (
    <Card className="text-center">
      <p className="text-sm text-gray-600">{children}</p>
      <Link href={href} className={`${BTN_PRIMARY} mt-3`}>
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
