import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { WatchlistForm } from "@/components/watchlist/WatchlistForm";
import { WatchlistRow } from "@/components/watchlist/WatchlistRow";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function WatchlistPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: watchlist } = await supabase
    .from("trend_watchlist")
    .select("id, category_name, keywords, is_active")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <section>
        <h1 className="mb-2 text-2xl font-black text-gray-900">관심 키워드 등록</h1>
        <p className="mb-6 text-sm text-gray-500">
          카테고리와 추적하고 싶은 키워드를 등록해두면, 네이버 데이터랩(관심도 추이)과
          네이버쇼핑(경쟁 상품 수)을 결합해 기회 점수를 계산해드립니다.
        </p>
        <WatchlistForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">등록된 관심 목록</h2>
        {!watchlist?.length && <p className="text-sm text-gray-400">아직 등록된 관심 목록이 없습니다.</p>}
        {watchlist?.map((w) => (
          <WatchlistRow
            key={w.id}
            id={w.id}
            categoryName={w.category_name}
            keywords={w.keywords}
            isActive={w.is_active}
          />
        ))}
      </section>
    </div>
  );
}
