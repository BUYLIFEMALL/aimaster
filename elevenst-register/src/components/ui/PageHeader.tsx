import type { ReactNode } from "react";
import { ShieldCheck, Activity } from "lucide-react";

/** 페이지 머리글(107. 11번가 오리지널 레드 스튜디오 테마) */
export function PageHeader({
  emoji,
  title,
  description,
  children,
}: {
  emoji: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 pb-5">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-xl font-extrabold text-slate-900 sm:text-2xl tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-lg shadow-sm text-[#FA0050]" aria-hidden>
            {emoji}
          </span>
          <span>{title}</span>
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-600 font-medium">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-bold text-[#FA0050] shadow-xs">
          <ShieldCheck size={13} className="text-emerald-600" />
          <span>보안 격리: 내 11번가 판매자 계정만 연동</span>
        </div>
        {children}
      </div>
    </header>
  );
}

/** 안내·주의 상자 (107. 11번가 레드 & 에메랄드 & 앰버 테마) */
export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "tip";
  children: ReactNode;
}) {
  const cls =
    tone === "warn"
      ? "border-amber-400 bg-amber-50/80 text-amber-950"
      : tone === "tip"
      ? "border-emerald-500 bg-emerald-50/80 text-emerald-950"
      : "border-[#FA0050] bg-rose-50/80 text-rose-950";

  return (
    <div className={`rounded-xl border-l-4 px-4 py-3 text-[13px] leading-relaxed shadow-xs ${cls}`}>
      {children}
    </div>
  );
}
