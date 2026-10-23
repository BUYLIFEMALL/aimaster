// 화면 맨 위 히어로 — 배지 + 제목 + 목적 + 팁 + 오른쪽 버튼. 스마트 매트릭스 공통 부품(globals.css .mx-hero, 기준 blog-keyword).
export function PageHero({
  badge,
  title,
  description,
  tip,
  children,
}: {
  badge: string;
  title: string;
  description: string;
  tip?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-hero">
      <div className="mx-hero-text">
        <span className="mx-hero-badge">{badge}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {tip && <p className="mx-hero-tip">💡 {tip}</p>}
      </div>
      {children && <div className="mx-hero-actions">{children}</div>}
    </div>
  );
}
