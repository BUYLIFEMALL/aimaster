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

export default async function HistoryPage() {
  const user = await requireProgramAccess();

  const supabase = await createClient();
  const { data: readings, error } = await supabase
    .from("tarot_readings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Tarot history query error:", error);
  }

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
    </div>
  );
}
