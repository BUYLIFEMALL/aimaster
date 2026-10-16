// 상단 핵심 지표(KPI) 카드 — 스마트 매트릭스 스타일 공통 부품.
export function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = "blue",
}: {
  icon: string;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "blue" | "amber" | "green" | "muted";
}) {
  const bar = {
    blue: "bg-mx-primary",
    amber: "bg-mx-accent",
    green: "bg-mx-success",
    muted: "bg-mx-border",
  }[tone];

  return (
    <div className="mx-kpi relative overflow-hidden">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${bar}`} />
      <p className="mx-kpi-label">
        <span>{icon}</span>
        {label}
      </p>
      <p className="mx-kpi-value">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-mx-muted">{hint}</p>}
    </div>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}
