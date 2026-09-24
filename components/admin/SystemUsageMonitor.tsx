"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Database,
  Server,
  RefreshCw,
  Zap,
  CheckCircle2,
  XCircle,
  Key,
  Search,
  ExternalLink,
  BarChart3,
  AlertCircle
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";

interface ProgramMetric {
  id: string;
  name: string;
  slug: string;
  category: string;
  app_url: string;
  is_active: boolean;
  metrics: {
    totalLogs: number;
    last24hLogs: number;
    last7dLogs: number;
    uniqueUsersCount: number;
    lastActiveAt: string | null;
  };
  health: {
    status: "online" | "redirect" | "offline";
    statusCode: number;
    latencyMs: number;
  };
}

interface UsageSummary {
  totalPrograms: number;
  onlinePrograms: number;
  totalLogs: number;
  total24hLogs: number;
  total7dLogs: number;
  totalApiKeys: number;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "기록 없음";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${diffDay}일 전`;
}

export default function SystemUsageMonitor() {
  const [data, setData] = useState<{
    summary: UsageSummary;
    programs: ProgramMetric[];
    timestamp: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const fetchUsageData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/system-usage", { cache: "no-store" });
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `서버 에러 (${res.status})`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchUsageData();
    }, 30000); // 30s auto refresh
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const categories = data
    ? Array.from(new Set(data.programs.map((p) => p.category || "기타")))
    : [];

  const filteredPrograms = data
    ? data.programs.filter((p) => {
        const matchesCategory =
          selectedCategory === "all" || p.category === selectedCategory;
        const matchesSearch =
          !searchQuery.trim() ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.slug.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
    : [];

  return (
    <div className="space-y-6 mt-10 border-t border-white/10 pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-gold animate-pulse" />
            <span>
              <GoldGradientText>실시간 시스템 & 사용량</GoldGradientText> 모니터링
            </span>
          </h2>
          <p className="text-subtext text-xs mt-1">
            Supabase 공유 DB 사용량, 프로그램별 트래픽 및 Vercel 라이브 서버 가동 상태
          </p>
        </div>

        {/* Refresh & Auto-refresh Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-subtext bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded accent-gold"
            />
            <span>30초 자동 갱신</span>
          </label>

          <button
            onClick={() => fetchUsageData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "갱신 중..." : "새로고침"}</span>
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <GlassCard className="p-8 text-center text-subtext text-sm">
          <RefreshCw className="h-6 w-6 animate-spin text-gold mx-auto mb-2" />
          실시간 사용량 및 Vercel 상태 데이터를 수집하고 있습니다...
        </GlassCard>
      ) : error ? (
        <GlassCard className="p-6 border-red-500/30 text-red-400 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </GlassCard>
      ) : data ? (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Supabase Logs Total */}
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Database className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  Supabase DB
                </span>
              </div>
              <div className="text-xl font-black text-white">
                {data.summary.totalLogs.toLocaleString()}
                <span className="text-xs text-subtext font-normal ml-1">건</span>
              </div>
              <div className="text-subtext text-xs mt-1 flex items-center gap-1">
                <span className="text-blue-400 font-medium">
                  +{data.summary.total24hLogs.toLocaleString()}
                </span>
                <span>(최근 24시간)</span>
              </div>
            </GlassCard>

            {/* Metric 2: 24h Traffic */}
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-gold" />
                </div>
                <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                  24시간 트래픽
                </span>
              </div>
              <div className="text-xl font-black text-gold">
                {data.summary.total24hLogs.toLocaleString()}
                <span className="text-xs text-subtext font-normal ml-1">건</span>
              </div>
              <div className="text-subtext text-xs mt-1">
                7일간 누적: {data.summary.total7dLogs.toLocaleString()}건
              </div>
            </GlassCard>

            {/* Metric 3: User API Keys Registered */}
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Key className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  플랫폼 연동
                </span>
              </div>
              <div className="text-xl font-black text-emerald-400">
                {data.summary.totalApiKeys.toLocaleString()}
                <span className="text-xs text-subtext font-normal ml-1">개</span>
              </div>
              <div className="text-subtext text-xs mt-1">회원 개별 연동 API 키</div>
            </GlassCard>

            {/* Metric 4: Vercel Live Health */}
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Server className="h-4 w-4 text-purple-400" />
                </div>
                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  Vercel 상태
                </span>
              </div>
              <div className="text-xl font-black text-purple-300 flex items-center gap-2">
                <span>
                  {data.summary.onlinePrograms} / {data.summary.totalPrograms}
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  정상
                </span>
              </div>
              <div className="text-subtext text-xs mt-1">서브프로젝트 서버 가동률</div>
            </GlassCard>
          </div>

          {/* Filter Bar & Search */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <span className="text-xs font-bold text-subtext shrink-0 mr-1">
                  카테고리:
                </span>
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                    selectedCategory === "all"
                      ? "bg-gold text-black font-bold"
                      : "bg-white/5 text-subtext hover:bg-white/10 border border-white/10"
                  }`}
                >
                  전체 ({data.programs.length})
                </button>
                {categories.map((cat) => {
                  const count = data.programs.filter((p) => p.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                        selectedCategory === cat
                          ? "bg-gold text-black font-bold"
                          : "bg-white/5 text-subtext hover:bg-white/10 border border-white/10"
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtext" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="프로그램명 또는 slug 검색..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-subtext focus:border-gold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Program Usage Table */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gold" />
                <span>프로그램별 Supabase DB 사용량 및 Vercel 서버 헬스</span>
              </h3>
              <span className="text-xs text-subtext">
                마지막 측정 시각: {new Date(data.timestamp).toLocaleTimeString("ko-KR")}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-[11px] text-subtext">
                    <th className="p-3.5 pl-5">프로그램 정보</th>
                    <th className="p-3.5">Vercel 상태 (Ping)</th>
                    <th className="p-3.5 text-right">총 실행/로그</th>
                    <th className="p-3.5 text-right">24시간 트래픽</th>
                    <th className="p-3.5 text-right">이용 회원</th>
                    <th className="p-3.5 pr-5 text-right">최근 트래픽</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {filteredPrograms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-subtext">
                        조건에 일치하는 프로그램 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredPrograms.map((prog) => (
                      <tr key={prog.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Title & Slug */}
                        <td className="p-3.5 pl-5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{prog.name}</span>
                            <span className="text-[10px] bg-white/10 text-subtext px-2 py-0.5 rounded border border-white/10">
                              {prog.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-subtext font-mono">
                              {prog.slug}
                            </span>
                            {prog.app_url && (
                              <a
                                href={prog.app_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-gold hover:underline flex items-center gap-0.5 text-[10px]"
                              >
                                <span>URL</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Vercel Status */}
                        <td className="p-3.5">
                          {prog.health.status === "online" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              <span>200 OK ({prog.health.latencyMs}ms)</span>
                            </span>
                          ) : prog.health.status === "redirect" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              <CheckCircle2 className="h-3 w-3 text-amber-400" />
                              <span>307 Redirect ({prog.health.latencyMs}ms)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                              <XCircle className="h-3 w-3 text-red-400" />
                              <span>Offline</span>
                            </span>
                          )}
                        </td>

                        {/* Total Logs */}
                        <td className="p-3.5 text-right font-mono font-medium text-white">
                          {prog.metrics.totalLogs.toLocaleString()}건
                        </td>

                        {/* 24h Logs */}
                        <td className="p-3.5 text-right font-mono">
                          {prog.metrics.last24hLogs > 0 ? (
                            <span className="text-gold font-bold bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
                              +{prog.metrics.last24hLogs.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-subtext">0건</span>
                          )}
                        </td>

                        {/* Unique Users */}
                        <td className="p-3.5 text-right font-mono text-subtext">
                          {prog.metrics.uniqueUsersCount}명
                        </td>

                        {/* Last Active At */}
                        <td className="p-3.5 pr-5 text-right text-subtext text-[11px]">
                          {formatRelativeTime(prog.metrics.lastActiveAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      ) : null}
    </div>
  );
}
