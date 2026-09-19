import type { Metadata } from "next";
import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { HistoryList } from "@/components/HistoryList";
import { SPREAD_CONFIGS, type SpreadType } from "@/lib/deck";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "내 타로 보관함 | AIMaster 타로점",
  description: "내가 뽑았던 타로 카드와 AI 종합 해석 히스토리를 확인해보세요.",
};

const PAGE_SIZE = 10;
const SPREAD_TYPES = Object.keys(SPREAD_CONFIGS) as SpreadType[];

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; spread?: string }>;
}) {
  const user = await requireProgramAccess();
  const { page: pageParam, spread: spreadParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // 잘못된 값이 들어오면(예: 예전에 있던 스프레드가 없어짐) "전체"로 취급한다.
  const activeSpread = spreadParam && SPREAD_TYPES.includes(spreadParam as SpreadType)
    ? (spreadParam as SpreadType)
    : null;

  const supabase = await createClient();

  // 카테고리 탭에 표시할 스프레드별 건수 — 전체 목록을 다시 조회하지 않도록 spread_type
  // 컬럼만 가볍게 가져와 집계한다.
  const { data: allSpreadTypes } = await supabase
    .from("tarot_readings")
    .select("spread_type")
    .eq("user_id", user.id);

  const countBySpread: Partial<Record<SpreadType, number>> = {};
  for (const row of allSpreadTypes ?? []) {
    const t = row.spread_type as SpreadType;
    countBySpread[t] = (countBySpread[t] ?? 0) + 1;
  }
  const totalAllCount = allSpreadTypes?.length ?? 0;

  let query = supabase
    .from("tarot_readings")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);
  if (activeSpread) {
    query = query.eq("spread_type", activeSpread);
  }

  const { data: readings, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Tarot history query error:", error);
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (activeSpread) params.set("spread", activeSpread);
    params.set("page", String(targetPage));
    return `/history?${params.toString()}`;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 mb-1">📖 내 타로 보관함</h1>
          <p className="text-xs text-neutral-400">
            회원님이 이전에 뽑았던 타로 카드와 AI 종합 심층 해석 보관 기록입니다.
          </p>
        </div>
        <Link
          href="/draw"
          className="px-4 py-2 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition-colors shadow-sm"
        >
          🔮 새 카드 뽑기
        </Link>
      </div>

      {/* 스프레드 종류별 카테고리 필터 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/history?page=1"
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            !activeSpread
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
          }`}
        >
          전체 ({totalAllCount})
        </Link>
        {SPREAD_TYPES.map((type) => {
          const config = SPREAD_CONFIGS[type];
          const spreadCount = countBySpread[type] ?? 0;
          if (spreadCount === 0) return null;
          return (
            <Link
              key={type}
              href={`/history?spread=${type}&page=1`}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                activeSpread === type
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
              }`}
            >
              {config.badge} ({spreadCount})
            </Link>
          );
        })}
      </div>

      <HistoryList readings={readings || []} />

      {totalCount > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link
            href={pageHref(page - 1)}
            aria-disabled={page <= 1}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
              page <= 1
                ? "pointer-events-none opacity-40 border-neutral-200 text-neutral-400"
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            ← 이전
          </Link>
          <span className="text-xs font-bold text-neutral-500">
            {page} / {totalPages} 페이지
          </span>
          <Link
            href={pageHref(page + 1)}
            aria-disabled={page >= totalPages}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
              page >= totalPages
                ? "pointer-events-none opacity-40 border-neutral-200 text-neutral-400"
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            다음 →
          </Link>
        </div>
      )}
    </div>
  );
}
