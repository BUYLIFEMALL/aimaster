"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, Clock, Play, ArrowRight, Sparkles, X, ChevronRight, Megaphone } from "lucide-react";
import type { Program } from "@/types/database.types";
import { getTemplateBadge } from "@/lib/templateBadge";
import { FAVORITES_EVENT, markFavoriteSeen, readFavorites, readNoticeSeen, readSeenVersions, syncFavorites, toggleFavorite } from "@/lib/favorites/client";

export interface WorkspaceNotice {
  id: string;
  title: string;
  program_ids: string[];
  created_at: string;
}

interface UserWorkspaceProps {
  programs: Program[];
  notices?: WorkspaceNotice[];
}

export default function UserWorkspace({ programs, notices = [] }: UserWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"favorites" | "recent">("favorites");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [seenVersions, setSeenVersions] = useState<Record<string, string>>({});
  const [noticeSeen, setNoticeSeen] = useState<Record<string, string>>({});
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // 즐겨찾기는 공용 부품(lib/favorites/client.ts — 로그인 회원은 DB), 최근 실행은 브라우저 저장소
  const loadWorkspaceData = () => {
    setFavoriteIds(readFavorites());
    setSeenVersions(readSeenVersions());
    setNoticeSeen(readNoticeSeen());
    try {
      const recRaw = localStorage.getItem("aimaster_recent_programs");
      setRecentIds(recRaw ? JSON.parse(recRaw) : []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadWorkspaceData();
    void syncFavorites();

    // 외부 카드에서 별표 토글 또는 프로그램 실행 시 실시간 이벤트 수신
    const handleWorkspaceUpdate = () => {
      loadWorkspaceData();
    };

    window.addEventListener(FAVORITES_EVENT, handleWorkspaceUpdate);
    window.addEventListener("aimaster-recent-changed", handleWorkspaceUpdate);

    return () => {
      window.removeEventListener(FAVORITES_EVENT, handleWorkspaceUpdate);
      window.removeEventListener("aimaster-recent-changed", handleWorkspaceUpdate);
    };
  }, []);

  const removeFavorite = (p: Program, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void toggleFavorite(p.id, p.version);
  };

  const programMap = new Map(programs.map((p) => [p.id, p]));
  const favoritePrograms = favoriteIds.map((id) => programMap.get(id)).filter(Boolean) as Program[];

  // 「봤음」 기록이 없는 즐겨찾기(이 기능 전에 고정한 것)는 지금 버전을 기록 — 처음부터 모든 카드에 점이 뜨지 않게
  useEffect(() => {
    for (const p of favoritePrograms) if ((p.version && !seenVersions[p.id]) || !noticeSeen[p.id]) void markFavoriteSeen(p.id, p.version);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteIds.join(","), Object.keys(seenVersions).length, Object.keys(noticeSeen).length]);
  const hasNewVersion = (p: Program) => Boolean(p.version && seenVersions[p.id] && seenVersions[p.id] !== p.version);
  // 마지막으로 본 뒤(없으면 고정한 뒤) 올라온, 이 프로그램이 연결된 가장 최근 공지(공지는 최신순)
  const newNoticeFor = (p: Program) => {
    const since = noticeSeen[p.id];
    if (!since) return null;
    return notices.find((n) => n.program_ids.includes(p.id) && new Date(n.created_at) > new Date(since)) ?? null;
  };
  const recentPrograms = recentIds.map((id) => programMap.get(id)).filter(Boolean) as Program[];

  if (!isMounted) return null;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 mb-8">
      <div className="rounded-2xl border border-gold/30 bg-[#0c0c14]/80 backdrop-blur-xl p-4 sm:p-5 shadow-2xl shadow-gold/5 space-y-4">
        {/* 상단 탭 헤더 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-gold/15 text-gold border border-gold/30">
              <Star size={16} className="fill-gold" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>나만의 작업대</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gold/20 text-gold font-mono font-bold">
                  Quick Access
                </span>
              </h3>
            </div>
          </div>

          {/* 탭 스위처: 즐겨찾기 vs 최근 실행 */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/50 border border-white/10 text-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("favorites")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "favorites"
                  ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-sm"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <Star size={13} className={activeTab === "favorites" ? "fill-slate-950" : ""} />
              <span>즐겨찾는 프로그램</span>
              <span className="text-[10px] font-mono opacity-80">({favoritePrograms.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("recent")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "recent"
                  ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-sm"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <Clock size={13} />
              <span>최근 실행</span>
              <span className="text-[10px] font-mono opacity-80">({recentPrograms.length})</span>
            </button>
          </div>
        </div>

        {/* 탭 콘텐츠: 즐겨찾기 목록 */}
        {activeTab === "favorites" && (
          <div>
            {favoritePrograms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {favoritePrograms.map((p) => {
                  const badge = getTemplateBadge(p.slug, p.category?.slug);
                  const runUrl = p.app_url || `/programs/${p.slug}`;
                  return (
                    <div
                      key={p.id}
                      className="group relative p-3 rounded-xl border border-white/10 hover:border-gold/40 bg-white/[0.03] hover:bg-white/[0.06] transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.tone}`}>
                            <span>{badge.icon}</span>
                            <span>{badge.label}</span>
                          </span>
                          {hasNewVersion(p) && (
                            <span className="ml-auto mr-1 inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-400/40 px-1.5 py-0.5 text-[10px] font-bold text-rose-300" title={`${seenVersions[p.id]} → ${p.version}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                              새 버전 {p.version}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => removeFavorite(p, e)}
                            title="즐겨찾기 해제"
                            className="text-white/40 hover:text-rose-400 p-0.5 rounded transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>
                        <h4 className="text-white text-xs font-bold truncate group-hover:text-gold transition-colors">
                          {p.name}
                        </h4>
                        <p className="text-[11px] text-subtext line-clamp-1 mt-0.5">
                          {p.short_desc || p.category?.name}
                        </p>
                        {(() => {
                          const notice = newNoticeFor(p);
                          return notice ? (
                            <Link
                              href={`/support/notice/${notice.id}`}
                              onClick={() => void markFavoriteSeen(p.id, p.version)}
                              title={notice.title}
                              className="mt-2 flex min-h-[32px] items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20 transition-colors"
                            >
                              <Megaphone size={12} className="shrink-0" />
                              <span className="shrink-0">새 공지</span>
                              <span className="truncate font-normal text-sky-100/80">{notice.title}</span>
                            </Link>
                          ) : null;
                        })()}
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
                        <Link
                          href={`/programs/${p.slug}`}
                          onClick={() => void markFavoriteSeen(p.id, p.version)}
                          className="text-[10px] text-white/60 hover:text-white transition-colors"
                        >
                          상세보기
                        </Link>
                        <a
                          href={runUrl}
                          onClick={() => void markFavoriteSeen(p.id, p.version)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gold/20 hover:bg-gold text-gold hover:text-black font-bold text-[11px] transition-all cursor-pointer"
                        >
                          <Play size={10} className="fill-current" />
                          <span>실행</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 px-4 text-center rounded-xl bg-white/[0.02] border border-white/5">
                <Star size={24} className="mx-auto text-gold/40 mb-2" />
                <p className="text-xs text-white/80 font-medium">아직 즐겨찾기에 등록된 프로그램이 없습니다.</p>
                <p className="text-[11px] text-subtext mt-1">
                  아래 프로그램 카드의 <span className="text-gold font-bold">⭐ 별표 핀</span>을 클릭하면 매일 쓰는 도구를 이곳에 등록해두고 1초 만에 실행할 수 있습니다.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 탭 콘텐츠: 최근 실행 목록 */}
        {activeTab === "recent" && (
          <div>
            {recentPrograms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {recentPrograms.map((p) => {
                  const badge = getTemplateBadge(p.slug, p.category?.slug);
                  const runUrl = p.app_url || `/programs/${p.slug}`;
                  return (
                    <div
                      key={p.id}
                      className="group relative p-3 rounded-xl border border-white/10 hover:border-gold/40 bg-white/[0.03] hover:bg-white/[0.06] transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.tone}`}>
                            <span>{badge.icon}</span>
                            <span>{badge.label}</span>
                          </span>
                          <span className="text-[10px] text-subtext font-mono">Recent</span>
                        </div>
                        <h4 className="text-white text-xs font-bold truncate group-hover:text-gold transition-colors">
                          {p.name}
                        </h4>
                        <p className="text-[11px] text-subtext line-clamp-1 mt-0.5">
                          {p.short_desc || p.category?.name}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
                        <Link
                          href={`/programs/${p.slug}`}
                          className="text-[10px] text-white/60 hover:text-white transition-colors"
                        >
                          상세보기
                        </Link>
                        <a
                          href={runUrl}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gold/20 hover:bg-gold text-gold hover:text-black font-bold text-[11px] transition-all cursor-pointer"
                        >
                          <Play size={10} className="fill-current" />
                          <span>다시 실행</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 px-4 text-center rounded-xl bg-white/[0.02] border border-white/5">
                <Clock size={24} className="mx-auto text-white/30 mb-2" />
                <p className="text-xs text-white/80 font-medium">최근 실행한 프로그램 내역이 없습니다.</p>
                <p className="text-[11px] text-subtext mt-1">
                  프로그램 카드의 [실행하기] 또는 [자세히 보기]를 이용하시면 최근 실행 히스토리가 자동으로 기록됩니다.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
