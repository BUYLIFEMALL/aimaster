import type { Metadata } from "next";
import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { HistoryList } from "@/components/HistoryList";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "내 타로 보관함 | AIMaster 타로점",
  description: "내가 뽑았던 타로 카드와 AI 종합 해석 히스토리를 확인해보세요.",
};

const PAGE_SIZE = 10;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireProgramAccess();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const { data: readings, error, count } = await supabase
    .from("tarot_readings")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Tarot history query error:", error);
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
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

      <HistoryList readings={readings || []} />

      {totalCount > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link
            href={`/history?page=${page - 1}`}
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
            href={`/history?page=${page + 1}`}
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
