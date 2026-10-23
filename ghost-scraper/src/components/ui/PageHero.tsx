// 화면 맨 위 히어로 블록 — 단계 배지 + 제목 + 목적 설명 + 팁(선택) + 오른쪽 버튼.
// 스마트 매트릭스 스타일 공통 부품 (기준: longtail-keyword-expander/components/layout/PageHero.tsx)
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
    <div className="overflow-hidden rounded-2xl border border-mx-border bg-gradient-to-br from-[#172554] via-mx-surface to-mx-surface p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {badge && <span className="mx-chip-blue mb-2">{badge}</span>}
          <h1 className="text-2xl font-black text-mx-text">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-mx-muted">{description}</p>
          {tip && <p className="mt-2 text-xs text-[#fcd34d]">💡 {tip}</p>}
        </div>
        {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}
