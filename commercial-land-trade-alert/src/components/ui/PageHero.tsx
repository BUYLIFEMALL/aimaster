// 100. 골든 랜드 프롭테크 인텔리전스 HUD 대형 페이지 헤로 컴포넌트
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
    <div className="mb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {badge && (
            <span className="inline-block rounded-full bg-amber-500/15 border border-amber-500/40 px-3 py-0.5 text-xs font-black tracking-wider text-amber-400 font-mono">
              {badge}
            </span>
          )}
          <h1 className="mt-2.5 text-2xl font-black tracking-tight text-white md:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-400">
            {description}
          </p>
        </div>
        {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
      </div>
      {tip && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-[#121824] px-4 py-3 text-xs text-amber-300 font-medium flex items-center gap-2 shadow-lg">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px]">
            ⚡
          </span>
          <span>{tip}</span>
        </div>
      )}
    </div>
  );
}
