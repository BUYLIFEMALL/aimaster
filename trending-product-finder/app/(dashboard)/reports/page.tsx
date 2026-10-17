import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHero } from "@/components/ui/PageHero";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { LoadErrorNotice } from "@/components/ui/LoadErrorNotice";
import { logLoadErrors } from "@/lib/loadErrors";
import { Sparkline } from "@/components/ui/Sparkline";
import { TREND_DAYS, buildKeywordTrends, clampPage } from "@/lib/reportTrend";

/** v1.09: 한 페이지에 보여 줄 리포트 수(예전엔 최근 20개만 보이고 그 이전은 볼 수 없었음) */
const PAGE_SIZE = 20;
/** 추이 카드에 처음 보이는 키워드 수(나머지는 펼쳐서) */
const TREND_TOP = 8;

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

function scoreBar(score: number) {
  if (score >= 60) return "bg-mx-accent";
  if (score >= 35) return "bg-mx-primary";
  return "bg-mx-border";
}

function scoreColor(score: number) {
  if (score >= 60) return "bg-mx-accent/15 text-mx-accent border-mx-accent/40";
  if (score >= 35) return "bg-mx-primary/15 text-mx-link border-mx-primary/40";
  return "bg-mx-raised text-mx-muted border-mx-border";
}

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<{ page?: string }> }) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const params = (await searchParams) ?? {};

  // v1.09: 전체 개수를 먼저 세고, 요청한 페이지만 가져온다(20개씩)
  const { count: totalCount, error: countError } = await supabase
    .from("recommendation_reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE));
  const page = clampPage(params.page, totalPages);
  const from = (page - 1) * PAGE_SIZE;

  const { data: reports, error: reportsError } = await supabase
    .from("recommendation_reports")
    .select("id, watchlist_id, generated_at, ai_summary, items")
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  // v1.09: 키워드별 기회점수 추이 — 최근 90일 리포트만(이미 저장된 자료, 새 API 호출 없음)
  const since = new Date(Date.now() - TREND_DAYS * 86_400_000).toISOString();
  const { data: trendRows, error: trendError } = await supabase
    .from("recommendation_reports")
    .select("generated_at, watchlist_id, items")
    .eq("user_id", user.id)
    .gte("generated_at", since)
    .order("generated_at", { ascending: false })
    .limit(400);
  const trends = buildKeywordTrends(trendRows ?? []).filter((t) => t.points.length >= 2);

  const watchlistIds = Array.from(new Set([...(reports ?? []), ...(trendRows ?? [])].map((r) => r.watchlist_id)));
  const { data: watchlists, error: categoryError } = watchlistIds.length
    ? await supabase.from("trend_watchlist").select("id, category_name").eq("user_id", user.id).in("id", watchlistIds)
    : { data: [] as { id: string; category_name: string }[], error: null };
  // v1.11: 목록 조회 실패는 "리포트 없음"과 구분해 안내, 추이·카테고리 이름 실패는 작은 안내
  const listFailed = logLoadErrors("reports", { 개수: { error: countError }, 목록: { error: reportsError } }).length > 0;
  const extraFailed = logLoadErrors("reports", { 추이: { error: trendError }, 카테고리: { error: categoryError } });
  const categoryNameById = new Map((watchlists ?? []).map((w) => [w.id, w.category_name]));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="📊 STEP 2 · 트렌드 분석"
        title="트렌드 리포트"
        description="「키워드 발굴」에서 「지금 리포트 생성」을 누르거나 매일 오전 9시 자동 생성되면 여기에 쌓입니다. 기회점수 순으로 정렬해 보여 드려요."
        tip="11번가 키를 등록하면 경쟁 상품 수·가격대가, 유튜브 키를 등록하면 관련 영상 반응이 점수에 함께 반영됩니다."
      >
        <Link href="/watchlist" className="mx-btn-ghost">
          🔍 키워드 발굴로
        </Link>
      </PageHero>

      <details className="mx-card group mb-6 text-xs leading-relaxed text-mx-text">
        <summary className="cursor-pointer list-none text-sm font-bold text-mx-text">
          📐 관심도 지수·변화율·기회점수가 뜻하는 것 <span className="text-xs font-normal text-mx-muted group-open:hidden">(펼치기)</span>
        </summary>
        <div className="mt-3">
          

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
              <span className="mr-1 rounded-full border border-mx-accent/40 bg-mx-accent/15 px-1.5 py-0.5 font-semibold text-mx-accent">60점 이상 눈여겨볼 만함</span>
              <span className="mr-1 rounded-full border border-mx-primary/40 bg-mx-primary/15 px-1.5 py-0.5 font-semibold text-mx-link">35~59점 보통</span>
              <span className="rounded-full border border-mx-border bg-mx-raised px-1.5 py-0.5 font-semibold text-mx-muted">35점 미만 아직 신호 약함</span>
            </p>
            <p className="mt-1.5">
              기본은 관심도만 반영합니다. 설정 페이지에 <span className="font-semibold">11번가 API 키</span>를
              등록하면 등록 상품 수(경쟁이 많을수록 감점)가, <span className="font-semibold">YouTube Data API 키</span>를
              등록하면 최근 30일 관련 영상 반응(업로드량·조회수)이 함께 반영됩니다.
            </p>
          </div>
        </div>
      </details>

      {trends.length > 0 && (
        <section className="mx-card mb-6" aria-labelledby="trend-heading">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="trend-heading" className="text-sm font-bold text-mx-text">📈 키워드별 기회점수 추이</h2>
            <p className="text-xs text-mx-muted">최근 {TREND_DAYS}일 리포트 기준 · 하루 마지막 값 · 점선은 60점</p>
          </div>
          <TrendList trends={trends.slice(0, TREND_TOP)} categoryNameById={categoryNameById} />
          {trends.length > TREND_TOP && (
            <details className="group mt-3">
              <summary className="cursor-pointer list-none text-xs font-semibold text-mx-link">
                <span className="group-open:hidden">▼ 나머지 {trends.length - TREND_TOP}개 키워드 보기</span>
                <span className="hidden group-open:inline">▲ 접기</span>
              </summary>
              <div className="mt-3">
                <TrendList trends={trends.slice(TREND_TOP)} categoryNameById={categoryNameById} />
              </div>
            </details>
          )}
        </section>
      )}

      {listFailed && <LoadErrorNotice what="트렌드 리포트" retryHref={`/reports${page > 1 ? `?page=${page}` : ""}`} />}
      {!listFailed && extraFailed.length > 0 && (
        <p role="status" className="mb-4 text-xs text-mx-danger">
          ⚠️ {extraFailed.includes("추이") ? "점수 추이" : "카테고리 이름"}를 불러오지 못해 일부만 표시합니다. 새로고침하면 다시 시도합니다.
        </p>
      )}

      {!listFailed && !reports?.length && (
        <div className="mx-card py-16 text-center">
          <p className="text-5xl">📈</p>
          <p className="mt-3 text-sm text-mx-muted">아직 생성된 리포트가 없습니다.</p>
          <Link href="/watchlist" className="mx-btn-primary mt-4">
            🔍 키워드 등록하러 가기
          </Link>
        </div>
      )}

      <div className="space-y-6">
        {reports?.map((report) => {
          const items = [...((report.items as unknown as ReportItem[]) ?? [])].sort(
            (a, b) => b.opportunityScore - a.opportunityScore,
          );
          const categoryName = categoryNameById.get(report.watchlist_id);

          return (
            <section key={report.id} className="mx-card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-mx-text">🗂️ {categoryName ?? "카테고리"}</p>
                <p className="text-xs text-mx-muted">{formatDateTime(report.generated_at)}</p>
              </div>
              {report.ai_summary && (
                <p className="mb-3 rounded-lg border-l-4 border-mx-accent bg-mx-accent/10 px-3 py-2 text-xs text-[#fde68a]">
                  🤖 {report.ai_summary}
                </p>
              )}
              <div className="-mx-5 overflow-x-auto px-5">
                <table className="mx-table min-w-[760px]">
                  <thead>
                    <tr>
                      <th>키워드 · AI 추천 사유</th>
                      <th className="text-right">관심도</th>
                      <th className="text-right">변화율</th>
                      <th className="text-right">11번가 경쟁</th>
                      <th className="text-right">가격대</th>
                      <th className="text-right">유튜브 30일</th>
                      <th>기회점수</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.keyword}>
                        <td className="max-w-[260px]">
                          <p className="font-semibold">{item.keyword}</p>
                          {item.reason && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-mx-muted" title={item.reason}>
                              {item.reason}
                            </p>
                          )}
                        </td>
                        <td className="text-right tabular-nums">{item.trendIndex ?? "N/A"}</td>
                        <td
                          className={`whitespace-nowrap text-right tabular-nums ${
                            item.trendChangePct == null
                              ? "text-mx-muted"
                              : item.trendChangePct >= 0
                                ? "text-mx-success"
                                : "text-mx-danger"
                          }`}
                        >
                          {item.trendChangePct == null
                            ? "N/A"
                            : `${item.trendChangePct >= 0 ? "▲" : "▼"} ${Math.abs(item.trendChangePct).toFixed(1)}%`}
                        </td>
                        <td className="text-right tabular-nums text-mx-muted">
                          {item.productCount != null ? item.productCount.toLocaleString("ko-KR") : "-"}
                        </td>
                        <td className="whitespace-nowrap text-right text-xs tabular-nums text-mx-muted">
                          {item.minPrice != null ? `${item.minPrice.toLocaleString("ko-KR")}~${item.maxPrice?.toLocaleString("ko-KR")}원` : "-"}
                        </td>
                        <td className="text-right tabular-nums text-mx-muted">
                          {item.youtubeUploadCount != null ? `${item.youtubeUploadCount.toLocaleString("ko-KR")}개` : "-"}
                        </td>
                        <td className="w-36">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mx-raised">
                              <div className={`h-full rounded-full ${scoreBar(item.opportunityScore)}`} style={{ width: `${Math.min(100, item.opportunityScore)}%` }} />
                            </div>
                            <span className={`rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${scoreColor(item.opportunityScore)}`}>
                              {item.opportunityScore}
                            </span>
                          </div>
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/sourcing?keyword=${encodeURIComponent(item.keyword)}`}
                            className="whitespace-nowrap text-xs font-semibold text-mx-link hover:underline"
                          >
                            🌏 소싱
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {totalPages > 1 && (
        <nav className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm" aria-label="리포트 페이지">
          {page > 1 ? (
            <Link href={`/reports?page=${page - 1}`} className="mx-btn-ghost">← 최근 리포트</Link>
          ) : (
            <span className="mx-btn-ghost pointer-events-none opacity-40" aria-disabled="true">← 최근 리포트</span>
          )}
          <span className="px-2 text-mx-muted tabular-nums">
            {page} / {totalPages} 페이지 · 전체 {(totalCount ?? 0).toLocaleString("ko-KR")}개
          </span>
          {page < totalPages ? (
            <Link href={`/reports?page=${page + 1}`} className="mx-btn-ghost">이전 리포트 →</Link>
          ) : (
            <span className="mx-btn-ghost pointer-events-none opacity-40" aria-disabled="true">이전 리포트 →</span>
          )}
        </nav>
      )}
    </div>
  );
}

function TrendList({ trends, categoryNameById }: { trends: ReturnType<typeof buildKeywordTrends>; categoryNameById: Map<string, string> }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {trends.map((t) => (
        <li key={t.key} className="flex min-w-0 items-center gap-3 rounded-lg border border-mx-border bg-mx-raised/40 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-mx-text" title={t.keyword}>{t.keyword}</p>
            <p className="truncate text-xs text-mx-muted">
              {categoryNameById.get(t.watchlistId) ?? "카테고리"} · {t.points.length}회
            </p>
          </div>
          <Sparkline points={t.points} label={`${t.keyword} 기회점수 ${t.first}점에서 ${t.latest}점`} />
          <div className="w-14 shrink-0 text-right">
            <p className={`rounded-full border px-2 py-0.5 text-center text-xs font-bold tabular-nums ${scoreColor(t.latest)}`}>{t.latest}</p>
            <p className={`mt-0.5 text-xs tabular-nums ${t.delta > 0 ? "text-mx-success" : t.delta < 0 ? "text-mx-danger" : "text-mx-muted"}`}>
              {t.delta > 0 ? `▲${t.delta}` : t.delta < 0 ? `▼${Math.abs(t.delta)}` : "변화 없음"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
