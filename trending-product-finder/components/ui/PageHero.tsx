// 70. 퀀트 이커머스 인텔리전스 레이더 덱 스타일 히어로 블록
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
    <div className="mb-6 overflow-hidden rounded-2xl border border-mx-border bg-gradient-to-br from-[#083344]/80 via-mx-surface to-mx-surface p-5 shadow-xl shadow-black/20 md:p-6 ring-1 ring-mx-primary/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {badge && <span className="mx-chip-blue mb-2.5">{badge}</span>}
          <h1 className="text-2xl font-black tracking-tight text-mx-text md:text-3xl">{title}</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-mx-muted">{description}</p>
          {tip && <p className="mt-2 text-xs font-semibold text-[#fde68a]">💡 {tip}</p>}
        </div>
        {children && <div className="flex shrink-0 flex-wrap gap-2.5">{children}</div>}
      </div>
    </div>
  );
}
