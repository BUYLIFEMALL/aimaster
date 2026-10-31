import type { ReactNode } from "react";

/** 도구 화면 맨 위 제목 줄 — 이모티콘·제목·한 줄 설명·「내 상품만」 배지. */
export function PageHeader({ emoji, title, description, children }: { emoji: string; title: string; description: string; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
          <span aria-hidden>{emoji}</span>
          <span>{title}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-800">
          🔒 내 쿠팡 계정만 보입니다
        </span>
        {children}
      </div>
    </header>
  );
}

/** 안내·주의 상자 */
export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "tip"; children: ReactNode }) {
  const cls =
    tone === "warn"
      ? "border-amber-500 bg-amber-50 text-amber-900"
      : "border-blue-600 bg-blue-50 text-slate-800";
  return <div className={`rounded-md border-l-4 px-3.5 py-2.5 text-[13px] leading-relaxed ${cls}`}>{children}</div>;
}
