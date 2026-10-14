import { testTitle } from "@/lib/tests/registry";
import type { Trend } from "@/lib/tests/trends";

const COLORS = ["#4f46e5", "#0ea5e9", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#ef4444", "#14b8a6", "#64748b"];
const W = 640;
const H = 220;
const PAD = { l: 36, r: 16, t: 14, b: 30 };

function fmt(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 같은 검사를 여러 번 한 결과의 점수 변화(SVG 꺾은선). 서버 컴포넌트로 그린다. */
export function TrendChart({ trend }: { trend: Trend }) {
  const n = trend.points.length;
  const x = (i: number) => PAD.l + (n === 1 ? 0 : (i * (W - PAD.l - PAD.r)) / (n - 1));
  const y = (v: number) => PAD.t + ((100 - v) * (H - PAD.t - PAD.b)) / 100;
  return (
    <div className="trend">
      <h3>{testTitle(trend.testId)} <small>{n}회</small></h3>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${testTitle(trend.testId)} 점수 변화`}>
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#e5e7eb" strokeDasharray={v === 50 ? "4 4" : undefined} />
            <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{v}</text>
          </g>
        ))}
        {trend.series.map((s, si) => {
          const pts = trend.points.map((p, i) => [x(i), y(p.scores[s.key] ?? 50)] as const);
          return (
            <g key={s.key}>
              <polyline fill="none" stroke={COLORS[si % COLORS.length]} strokeWidth="2.5" points={pts.map(([px, py]) => `${px},${py}`).join(" ")} />
              {pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r="3.5" fill={COLORS[si % COLORS.length]} />)}
            </g>
          );
        })}
        {trend.points.map((p, i) => (
          <text key={p.at} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#64748b">{fmt(p.at)}</text>
        ))}
      </svg>
      <ul className="trend-legend">
        {trend.series.map((s, si) => <li key={s.key}><i style={{ background: COLORS[si % COLORS.length] }} />{s.label}</li>)}
      </ul>
    </div>
  );
}
