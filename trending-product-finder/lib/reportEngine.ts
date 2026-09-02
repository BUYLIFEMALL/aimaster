import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCategoryKeywordTrend, calcTrendChangePct, type NaverAuth } from "@/lib/naver/datalab";
import { calcOpportunityScore, generateReasons, type OpportunityResult } from "@/lib/ai/opportunity";
import { getYoutubeSignal } from "@/lib/youtube/client";
import { getCompetition } from "@/lib/elevenst/client";
import { resolveApiKey } from "@/lib/apiKeys";
import { sendViaSmtpAccount } from "@/lib/email/transport";
import { buildReportEmail } from "@/lib/email/reportSummary";
import type { Json, Database } from "@/types/database.types";

// 리포트 생성 핵심 로직 — 사용자가 직접 누르는 Server Action(lib/actions/reports.ts)과
// Vercel Cron(app/api/cron/generate-reports/route.ts) 양쪽에서 재사용한다. RLS가 걸린
// 사용자 세션 클라이언트든, service role(admin) 클라이언트든 둘 다 SupabaseClient<Database>
// 타입이라 그대로 넘길 수 있다.

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface WatchlistRow {
  id: string;
  user_id: string;
  category_name: string;
  naver_category_code: string | null;
  keywords: string[];
}

export type GenerateReportResult = { ok: true } | { ok: false; error: string };

/**
 * 관심 목록 1건에 대해 관심도 조회 → 기회 점수 계산 → AI 사유 생성 → 리포트 저장까지
 * 전부 수행한다. Phase 1 리포트 생성 액션과 정확히 동일한 로직이다.
 */
export async function generateReportForWatchlist(
  supabase: SupabaseClient<Database>,
  watchlist: WatchlistRow,
  options?: { notifyEmail?: boolean },
): Promise<GenerateReportResult> {
  const [naverClientId, naverClientSecret, openaiKey, geminiKey, youtubeApiKey, elevenstApiKey] = await Promise.all([
    resolveApiKey(supabase, watchlist.user_id, "naver_client_id"),
    resolveApiKey(supabase, watchlist.user_id, "naver_client_secret"),
    resolveApiKey(supabase, watchlist.user_id, "openai"),
    resolveApiKey(supabase, watchlist.user_id, "gemini"),
    resolveApiKey(supabase, watchlist.user_id, "youtube_api_key"),
    resolveApiKey(supabase, watchlist.user_id, "elevenst_api_key"),
  ]);

  if (!naverClientId || !naverClientSecret) {
    return { ok: false, error: "네이버 API 키 미등록" };
  }

  const auth: NaverAuth = { clientId: naverClientId, clientSecret: naverClientSecret };

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);

  const results: OpportunityResult[] = [];

  for (const keyword of watchlist.keywords) {
    try {
      const trendPoints = await getCategoryKeywordTrend(auth, {
        categoryName: watchlist.category_name,
        categoryCode: watchlist.naver_category_code ?? "",
        keyword,
        startDate: startDateStr,
        endDate: endDateStr,
        timeUnit: "week",
      });
      const trendIndex = trendPoints.length ? trendPoints[trendPoints.length - 1].ratio : null;
      const trendChangePct = calcTrendChangePct(trendPoints);

      await supabase.from("trend_snapshots").insert({
        user_id: watchlist.user_id,
        watchlist_id: watchlist.id,
        keyword,
        trend_index: trendIndex,
        period_start: startDateStr,
        period_end: endDateStr,
        time_unit: "week",
        source: "naver_shopping_insight",
        raw: trendPoints as unknown as Json,
      });

      let youtubeScore: number | null = null;
      let youtubeUploadCount: number | null = null;
      if (youtubeApiKey) {
        try {
          const signal = await getYoutubeSignal(keyword, youtubeApiKey);
          youtubeScore = signal.score;
          youtubeUploadCount = signal.recentUploadCount;
        } catch (err) {
          console.error(`[trending-product-finder] "${keyword}" 유튜브 신호 조회 실패:`, err);
        }
      }

      let productCount: number | null = null;
      let minPrice: number | null = null;
      let maxPrice: number | null = null;
      if (elevenstApiKey) {
        try {
          const competition = await getCompetition(keyword, { apiKey: elevenstApiKey });
          productCount = competition.totalCount;
          minPrice = competition.minPriceKrw;
          maxPrice = competition.maxPriceKrw;
        } catch (err) {
          console.error(`[trending-product-finder] "${keyword}" 11번가 경쟁도 조회 실패:`, err);
        }
      }

      const opportunityScore = calcOpportunityScore({
        keyword,
        trendIndex,
        trendChangePct,
        productCount,
        minPrice,
        maxPrice,
        youtubeScore,
        youtubeUploadCount,
      });

      results.push({
        keyword,
        trendIndex,
        trendChangePct,
        productCount,
        minPrice,
        maxPrice,
        youtubeScore,
        youtubeUploadCount,
        opportunityScore,
      });
    } catch (err) {
      results.push({
        keyword,
        trendIndex: null,
        trendChangePct: null,
        productCount: null,
        minPrice: null,
        maxPrice: null,
        youtubeScore: null,
        youtubeUploadCount: null,
        opportunityScore: 0,
      });
      console.error(`[trending-product-finder] "${keyword}" 조회 실패:`, err);
    }
  }

  let reasons = new Map<string, string>();
  if (openaiKey || geminiKey) {
    try {
      reasons = await generateReasons(results, { openai: openaiKey, gemini: geminiKey });
    } catch (err) {
      console.error("[trending-product-finder] AI 추천 사유 생성 실패:", err);
    }
  }

  const items = results
    .map((r) => ({ ...r, reason: reasons.get(r.keyword) ?? null }))
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  const { error: insertError } = await supabase.from("recommendation_reports").insert({
    user_id: watchlist.user_id,
    watchlist_id: watchlist.id,
    ai_summary: openaiKey || geminiKey ? null : "AI 키가 등록되지 않아 추천 사유 없이 지표만 계산했습니다.",
    items: items as unknown as Json,
  });
  if (insertError) return { ok: false, error: insertError.message };

  // Phase 10 — cron 자동 생성분만 이메일로 알림(버튼으로 직접 생성한 경우는 이미 화면을
  // 보고 있으니 중복 알림이라 보내지 않음). 운영자 공용 SMTP가 아니라 회원이 설정
  // 페이지에서 등록한 본인 SMTP 계정(user_smtp_accounts, BYOK)을 쓴다 — 계정이 없으면
  // 조용히 건너뛴다(에러 아님). 발송 실패도 리포트 생성 자체를 실패로 치지 않는다.
  if (options?.notifyEmail) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const [{ data: userData }, { data: smtpAccount }] = await Promise.all([
        admin.auth.admin.getUserById(watchlist.user_id),
        admin
          .from("user_smtp_accounts")
          .select("smtp_host, smtp_port, smtp_user, smtp_password, from_name")
          .eq("user_id", watchlist.user_id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle(),
      ]);
      if (userData.user?.email && smtpAccount) {
        const { subject, html } = buildReportEmail(watchlist.category_name, items);
        await sendViaSmtpAccount(smtpAccount, userData.user.email, subject, html);
      }
    } catch (err) {
      console.error(`[trending-product-finder] "${watchlist.category_name}" 리포트 이메일 발송 실패:`, err);
    }
  }

  return { ok: true };
}
