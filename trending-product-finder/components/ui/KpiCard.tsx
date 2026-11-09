// 70. 퀀트 이커머스 인텔리전스 레이더 덱 스타일 KPI 지표 카드
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
    blue: "bg-gradient-to-r from-[#06B6D4] to-[#0284C7]",
    amber: "bg-gradient-to-r from-[#F59E0B] to-[#D97706]",
    green: "bg-gradient-to-r from-[#10B981] to-[#059669]",
    muted: "bg-mx-border",
  }[tone];

  const valColor = {
    blue: "text-mx-link",
    amber: "text-amber-400",
    green: "text-emerald-400",
    muted: "text-mx-text",
  }[tone];

  return (
    <div className="mx-kpi relative overflow-hidden">
      <span className={`absolute inset-x-0 top-0 h-1 ${bar}`} />
      <p className="mx-kpi-label">
        <span className="text-base">{icon}</span>
        {label}
      </p>
      <p className={`mx-kpi-value ${valColor}`}>{value}</p>
      {hint && <p className="mt-1 truncate text-xs font-medium text-mx-muted">{hint}</p>}
    </div>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">{children}</div>;
}
