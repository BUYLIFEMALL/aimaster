// 100. 골든 랜드 프롭테크 인텔리전스 HUD 핵심 지표(KPI) 카드
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
    blue: "bg-amber-500",
    amber: "bg-amber-400",
    green: "bg-emerald-400",
    muted: "bg-[#1E293B]",
  }[tone];

  return (
    <div className="mx-kpi group">
      <span className={`absolute inset-x-0 top-0 h-1 ${bar}`} />
      <p className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
        <span>{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tabular-nums text-white group-hover:text-amber-400 transition-colors">
        {value}
      </p>
      {hint && <p className="mt-1 truncate text-xs text-gray-400 font-medium">{hint}</p>}
    </div>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">{children}</div>;
}
