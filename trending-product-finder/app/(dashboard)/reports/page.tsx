import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface ReportItem {
  keyword: string;
  trendIndex: number | null;
  trendChangePct: number | null;
  productCount: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  opportunityScore: number;
  reason: string | null;
}

function scoreColor(score: number) {
  if (score >= 60) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 35) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-gray-50 text-gray-500 border-gray-200";
}

export default async function ReportsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("recommendation_reports")
    .select("id, watchlist_id, generated_at, ai_summary, items")
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false })
    .limit(20);

  const watchlistIds = Array.from(new Set((reports ?? []).map((r) => r.watchlist_id)));
  const { data: watchlists } = watchlistIds.length
    ? await supabase.from("trend_watchlist").select("id, category_name").in("id", watchlistIds)
    : { data: [] as { id: string; category_name: string }[] };
  const categoryNameById = new Map((watchlists ?? []).map((w) => [w.id, w.category_name]));

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <section>
        <h1 className="mb-2 text-2xl font-black text-gray-900">트렌드 리포트</h1>
        <p className="mb-6 text-sm text-gray-500">
          관심 키워드 등록 페이지에서 &quot;지금 리포트 생성&quot;을 누르면 이곳에 결과가 쌓입니다.
          기회 점수는 관심도(데이터랩)와 경쟁도(등록 상품 수)를 함께 반영한 상대 지표입니다.
        </p>
      </section>

      {!reports?.length && <p className="text-sm text-gray-400">아직 생성된 리포트가 없습니다.</p>}

      {reports?.map((report) => {
        const items = (report.items as unknown as ReportItem[]) ?? [];
        const categoryName = categoryNameById.get(report.watchlist_id);

        return (
          <section key={report.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">{categoryName ?? "카테고리"}</p>
              <p className="text-xs text-gray-400">{new Date(report.generated_at).toLocaleString("ko-KR")}</p>
            </div>
            {report.ai_summary && <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">{report.ai_summary}</p>}
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.keyword} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900">{item.keyword}</p>
                    <span className={`text-xs font-bold rounded-full border px-2 py-0.5 ${scoreColor(item.opportunityScore)}`}>
                      기회점수 {item.opportunityScore}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    관심도 {item.trendIndex ?? "N/A"}
                    {item.trendChangePct != null && ` (전기 대비 ${item.trendChangePct > 0 ? "+" : ""}${item.trendChangePct.toFixed(1)}%)`}
                    {" · "}
                    등록상품 {item.productCount?.toLocaleString() ?? "N/A"}개
                    {item.minPrice != null && ` · ${item.minPrice.toLocaleString()}~${item.maxPrice?.toLocaleString()}원`}
                  </p>
                  {item.reason && <p className="mt-1 text-xs text-gray-700">{item.reason}</p>}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
