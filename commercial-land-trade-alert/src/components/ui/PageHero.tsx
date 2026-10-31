// 화면 맨 위 제목 — 부동산 시리즈(realty-listing-alert)와 같은 큰 제목 + 초록 안내 상자.
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
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {badge && <p className="text-xs font-extrabold tracking-wider text-mx-primary">{badge}</p>}
          <h1 className="mt-2 text-3xl font-black tracking-tight text-mx-text md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mx-muted">{description}</p>
        </div>
        {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
      </div>
      {tip && <p className="mt-4 rounded-2xl border border-[#b7e8cc] bg-[#e8f8ef] px-5 py-3 text-sm text-[#14532d]">✅ {tip}</p>}
    </div>
  );
}
