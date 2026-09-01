import Link from "next/link";
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
        <p className="mb-4 text-sm text-gray-500">
          관심 키워드 등록 페이지에서 &quot;지금 리포트 생성&quot;을 누르면 이곳에 결과가 쌓입니다.
          기회 점수는 현재 네이버쇼핑인사이트 관심도 지수 기반이며, 경쟁 상품 수 지표는 Phase 2에서
          추가될 예정입니다.
        </p>
        <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs leading-relaxed text-emerald-900">
          <p className="mb-1 font-bold">📊 관심도 지수·변화율·기회점수가 뜻하는 것</p>
          <p className="mb-1">
            <span className="font-semibold">관심도 지수(0~100)</span>는 실제 검색 횟수나 판매량이 아니라,
            최근 90일 구간 안에서 가장 관심이 높았던 시점을 100으로 두고 나머지를 상대적으로 환산한
            값입니다. 예를 들어 지수 50은 &quot;가장 관심이 뜨거웠던 주의 절반 수준&quot;이라는 뜻이지,
            검색량이 정확히 50건이라는 뜻이 아닙니다.
          </p>
          <p className="mb-1">
            <span className="font-semibold">변화율(%)</span>은 <span className="font-semibold">가장 최근 1주</span>의
            관심도 지수를, <span className="font-semibold">지난 90일 구간의 앞쪽 절반(초반) 평균</span>과
            비교한 값입니다. 예를 들어 +23%면 &quot;최근 1주 관심도가, 90일 전반부 평균보다 23% 더
            높다&quot;는 뜻으로, 최근 들어 관심이 오르고 있는지를 보여주는 지표입니다. 데이터가 부족하면
            변화율은 표시되지 않습니다(N/A).
          </p>
          <p>
            <span className="font-semibold">기회점수(0~100)</span>는 AI가 아니라 정해진 계산식으로
            산출합니다 — &quot;관심도 지수&quot;에 가장 큰 비중을 두고, 관심도가 &quot;상승 중&quot;이면
            보너스를 더하는 방식입니다(하락 중이어도 감점은 하지 않습니다). 즉 점수가 높을수록
            &quot;지금 관심이 많고, 최근 들어 더 오르고 있는&quot; 키워드라는 뜻입니다. 색으로도
            구분됩니다 —
            <span className="mx-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">60점 이상: 눈여겨볼 만함</span>
            <span className="mx-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700">35~59점: 보통</span>
            <span className="mx-1 rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-semibold text-gray-500">35점 미만: 아직 신호 약함</span>
            . 지금은 관심도만 반영하며, 실제 판매 경쟁이 얼마나 치열한지(등록 상품 수)는 Phase 2에서
            추가되면 점수 계산식도 함께 바뀔 예정입니다.
          </p>
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
                    {item.productCount != null && ` · 등록상품 ${item.productCount.toLocaleString()}개`}
                    {item.minPrice != null && ` · ${item.minPrice.toLocaleString()}~${item.maxPrice?.toLocaleString()}원`}
                  </p>
                  {item.reason && <p className="mt-1 text-xs text-gray-700">{item.reason}</p>}
                  <Link
                    href={`/sourcing?keyword=${encodeURIComponent(item.keyword)}`}
                    className="mt-1 inline-block rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100"
                  >
                    🌏 상품소싱 원가계산기로 보기
                  </Link>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
