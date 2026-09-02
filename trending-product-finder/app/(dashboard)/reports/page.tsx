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
  youtubeScore: number | null;
  youtubeUploadCount: number | null;
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
        <p className="mb-4 text-sm text-gray-500">
          관심 키워드 등록 페이지에서 &quot;지금 리포트 생성&quot;을 누르면 이곳에 결과가 쌓입니다.
          기회 점수는 현재 네이버쇼핑인사이트 관심도 지수 기반이며, 경쟁 상품 수 지표는 Phase 2에서
          추가될 예정입니다.
        </p>
        <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs leading-relaxed text-emerald-900">
          <p className="mb-3 font-bold">📊 관심도 지수·변화율·기회점수가 뜻하는 것</p>

          <div className="mb-3">
            <p className="font-semibold">① 관심도 지수 (0~100)</p>
            <p className="mt-0.5">
              실제 검색 횟수나 판매량이 아니라, <span className="font-semibold">최근 90일 중 관심이 가장
              높았던 시점을 100으로 놓고</span> 나머지를 그 대비 비율로 나타낸 값입니다.
              <br />
              예) 지수 50 = &quot;가장 관심이 뜨거웠던 시기의 절반 수준&quot;
            </p>
          </div>

          <div className="mb-3">
            <p className="font-semibold">② 변화율 (%)</p>
            <p className="mt-0.5">
              <span className="font-semibold">최근 1주</span>의 관심도를, <span className="font-semibold">90일
              중 앞쪽 절반(초반) 평균</span>과 비교한 값입니다.
              <br />
              예) +23% = &quot;최근 1주가 90일 초반 평균보다 23% 더 높다&quot; → 요즘 관심이 오르는 중
              <br />
              데이터가 부족하면 표시되지 않습니다(N/A).
            </p>
          </div>

          <div>
            <p className="font-semibold">③ 기회점수 (0~100)</p>
            <p className="mt-0.5">
              관심도 지수에 가장 큰 비중을 두고, 관심도가 오르는 중이면 보너스를 더해서 계산합니다
              (내려가도 감점은 없습니다).
              <br />
              점수가 높을수록 &quot;지금 관심 많고, 최근 더 오르는&quot; 키워드라는 뜻입니다.
            </p>
            <p className="mt-1.5">
              <span className="mr-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">60점 이상 눈여겨볼 만함</span>
              <span className="mr-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700">35~59점 보통</span>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-semibold text-gray-500">35점 미만 아직 신호 약함</span>
            </p>
            <p className="mt-1.5">
              기본은 관심도만 반영합니다. 설정 페이지에 <span className="font-semibold">YouTube Data API
              키</span>를 등록하면, 최근 30일간 관련 영상이 얼마나 많이 올라오는지(업로드량·조회수)도
              함께 반영됩니다.
            </p>
          </div>
        </div>
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
                    {item.productCount != null && ` · 🏪 11번가 등록상품 ${item.productCount.toLocaleString()}개`}
                    {item.minPrice != null && ` · ${item.minPrice.toLocaleString()}~${item.maxPrice?.toLocaleString()}원`}
                    {item.youtubeUploadCount != null &&
                      ` · 📺 최근 30일 관련영상 ${item.youtubeUploadCount.toLocaleString()}개`}
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
