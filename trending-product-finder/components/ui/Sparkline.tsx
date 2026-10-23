// v1.09: 작은 점수 추이 그래프(서버에서 그리는 SVG, 0~100점 기준). 차트 라이브러리 없이 가볍게.
import type { TrendPoint } from "@/lib/reportTrend";

export function Sparkline({ points, width = 140, height = 36, label }: { points: TrendPoint[]; width?: number; height?: number; label: string }) {
  const pad = 3;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const x = (i: number) => pad + (points.length <= 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (score: number) => pad + h - (Math.max(0, Math.min(100, score)) / 100) * h;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="block shrink-0">
      <line x1={pad} x2={width - pad} y1={y(60)} y2={y(60)} className="stroke-mx-border" strokeDasharray="2 3" strokeWidth={1} />
      {points.length > 1 && <path d={path} fill="none" className="stroke-mx-link" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />}
      {last && <circle cx={x(points.length - 1)} cy={y(last.score)} r={2.6} className="fill-mx-accent" />}
    </svg>
  );
}
