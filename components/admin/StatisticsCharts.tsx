"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import GlassCard from "@/components/ui/GlassCard";

interface MonthlyRevenue {
  month: string;
  revenue: number;
  count: number;
}

interface GradeDistribution {
  name: string;
  count: number;
  color: string;
}

interface TopProgram {
  name: string;
  revenue: number;
  subscriptions: number;
}

interface StatisticsChartsProps {
  monthlyRevenue: MonthlyRevenue[];
  gradeDistribution: GradeDistribution[];
  topPrograms: TopProgram[];
  monthlyMembers: { month: string; count: number }[];
}

function formatKRWShort(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(0)}만`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}천`;
  return value.toLocaleString();
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg p-3 text-sm">
      <p className="text-white font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-subtext">
          {p.name === "revenue" ? "매출" : p.name === "count" ? "건수" : p.name}:{" "}
          <span className="text-gold font-medium">
            {p.name === "revenue" ? `₩${p.value.toLocaleString()}` : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

export default function StatisticsCharts({
  monthlyRevenue,
  gradeDistribution,
  topPrograms,
  monthlyMembers,
}: StatisticsChartsProps) {
  return (
    <div className="space-y-6">
      {/* 월별 매출 차트 */}
      <GlassCard>
        <h3 className="text-white font-bold mb-4">월별 매출 추이</h3>
        {monthlyRevenue.length === 0 ? (
          <p className="text-subtext text-sm text-center py-8">결제 데이터가 없습니다</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyRevenue}>
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" tick={{ fill: "#a0a0b0", fontSize: 12 }} />
              <YAxis tick={{ fill: "#a0a0b0", fontSize: 12 }} tickFormatter={formatKRWShort} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#d4af37"
                strokeWidth={2}
                fill="url(#goldGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 월별 신규 회원 */}
        <GlassCard>
          <h3 className="text-white font-bold mb-4">월별 신규 회원</h3>
          {monthlyMembers.length === 0 ? (
            <p className="text-subtext text-sm text-center py-8">회원 데이터가 없습니다</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyMembers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="month" tick={{ fill: "#a0a0b0", fontSize: 12 }} />
                <YAxis tick={{ fill: "#a0a0b0", fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        {/* 등급별 회원 분포 */}
        <GlassCard>
          <h3 className="text-white font-bold mb-4">등급별 회원 분포</h3>
          {gradeDistribution.length === 0 || gradeDistribution.every((g) => g.count === 0) ? (
            <p className="text-subtext text-sm text-center py-8">등급이 배정된 회원이 없습니다</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={gradeDistribution.filter((g) => g.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {gradeDistribution
                      .filter((g) => g.count > 0)
                      .map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {gradeDistribution.map((g) => (
                  <div key={g.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: g.color }}
                    />
                    <span className="text-subtext flex-1">{g.name}</span>
                    <span className="text-white font-medium">{g.count}명</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* 인기 프로그램 */}
      <GlassCard>
        <h3 className="text-white font-bold mb-4">프로그램별 매출</h3>
        {topPrograms.length === 0 ? (
          <p className="text-subtext text-sm text-center py-8">프로그램 매출 데이터가 없습니다</p>
        ) : (
          <div className="space-y-3">
            {topPrograms.map((p, i) => {
              const maxRevenue = Math.max(...topPrograms.map((t) => t.revenue), 1);
              return (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-gold font-bold text-sm w-6">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium truncate">
                        {p.name}
                      </span>
                      <span className="text-gold text-sm font-bold ml-2">
                        ₩{p.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-gold to-gold-light h-2 rounded-full transition-all"
                        style={{ width: `${(p.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                    <span className="text-subtext text-xs mt-0.5">
                      {p.subscriptions}건 구독
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
