"use client";

import { ShieldCheck, Sparkles } from "lucide-react";
import { LangSwitcher, useLang } from "@/components/tool/LangProvider";

export function TopBar() {
  const { t } = useLang();
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1e293b] bg-[#111726]/80 p-3.5 px-4 backdrop-blur-md shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
          <Sparkles size={13} />
        </div>
        <p className="text-xs font-medium text-slate-300">{t.tagline}</p>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
          <ShieldCheck size={12} />
          <span>100% 온디바이스 로컬 보안</span>
        </span>
      </div>
      <LangSwitcher />
    </div>
  );
}
