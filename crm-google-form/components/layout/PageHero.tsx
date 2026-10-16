// 각 화면 맨 위의 히어로 블록 — 단계 배지 + 제목 + 목적 설명 + 팁(선택).
// 스마트 매트릭스 스타일 공통 부품 — 라이트 변형(연파랑 그라데이션·진한 앰버 팁). docs/DESIGN_HANDOFF.md
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
    <div className="mb-6 overflow-hidden rounded-2xl border border-mx-border bg-gradient-to-br from-[#eff6ff] via-mx-surface to-mx-surface p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {badge && <span className="mx-chip-blue mb-2">{badge}</span>}
          <h1 className="text-2xl font-black text-mx-text">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-mx-muted">{description}</p>
          {tip && <p className="mt-2 text-xs text-[#92400e]">💡 {tip}</p>}
        </div>
        {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}
