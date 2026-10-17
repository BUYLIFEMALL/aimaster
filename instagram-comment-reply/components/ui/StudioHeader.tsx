// 스튜디오식 페이지 머리말 — 큰 제목 + 설명 + 오른쪽 동작 버튼 자리
export function StudioHeader({
  icon,
  title,
  description,
  children,
}: {
  icon?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-ig-border pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ig-text">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ig-muted">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </div>
  );
}

// 채널 분석 카드처럼 큰 숫자 + 라벨
export function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-ig-border bg-ig-surface p-4">
      <p className="text-xs font-medium text-ig-muted">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${accent ? "text-ig-link" : "text-ig-text"}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-ig-muted">{hint}</p>}
    </div>
  );
}

// 인스타 댓글처럼 동그란 프로필(이름 첫 글자)
export function Avatar({ name, size = 36 }: { name: string | null; size?: number }) {
  const label = (name ?? "?").replace(/^@/, "").trim().charAt(0).toUpperCase() || "?";
  const hues = [0, 25, 200, 140, 280, 330, 45, 170];
  const hue = hues[(name ?? "").length % hues.length];
  return (
    <span aria-hidden="true" className="ig-gradient inline-flex shrink-0 rounded-full p-[2px]">
      <span
        className="inline-flex items-center justify-center rounded-full border-2 border-white font-bold text-white"
        style={{ width: size - 4, height: size - 4, fontSize: size * 0.4, backgroundColor: `hsl(${hue} 55% 45%)` }}
      >
        {label}
      </span>
    </span>
  );
}
