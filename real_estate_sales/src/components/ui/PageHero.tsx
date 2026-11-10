// 화면 맨 위 히어로 블록 — 89. 네이버 부동산 스마트 매트릭스 저널 스타일
export function PageHero({
  badge,
  title,
  description,
  tip,
  children,
}: {
  badge?: string;
  title: string;
  description: string;
  tip?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#C2E8D4] bg-gradient-to-br from-[#EAF8F1] via-white to-white p-6 shadow-[0_4px_20px_rgba(3,199,90,0.04)] md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {badge && (
            <span className="mb-2.5 inline-flex items-center rounded-full border border-[#03C75A]/30 bg-[#03C75A]/10 px-3 py-1 text-xs font-black text-[#03C75A]">
              {badge}
            </span>
          )}
          <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-[26px]">{title}</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 font-medium">{description}</p>
          {tip && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              <span>💡</span>
              <span>{tip}</span>
            </div>
          )}
        </div>
        {children && <div className="flex shrink-0 flex-wrap gap-2.5">{children}</div>}
      </div>
    </div>
  );
}
