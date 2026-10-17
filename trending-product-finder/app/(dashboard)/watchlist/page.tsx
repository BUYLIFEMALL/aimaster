import { PageHero } from "@/components/ui/PageHero";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { LoadErrorNotice } from "@/components/ui/LoadErrorNotice";
import { logLoadErrors } from "@/lib/loadErrors";
import { WatchlistWorkspace } from "@/components/watchlist/WatchlistWorkspace";
import type { WatchlistEntry } from "@/lib/actions/watchlist";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function WatchlistPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: watchlist, error: watchlistError } = await supabase
    .from("trend_watchlist")
    .select(
      "id, category_name, naver_category_code, keywords, is_active, sourcing_alert_enabled, sourcing_alert_interval_minutes, sourcing_alert_channels, sourcing_alert_active_hour_start, sourcing_alert_active_hour_end, sourcing_alert_notify_mode",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const initialEntries: WatchlistEntry[] = (watchlist ?? []).map((w) => ({
    id: w.id,
    categoryName: w.category_name,
    naverCategoryCode: w.naver_category_code,
    keywords: w.keywords,
    isActive: w.is_active,
    sourcingAlertEnabled: w.sourcing_alert_enabled,
    sourcingAlertIntervalMinutes: w.sourcing_alert_interval_minutes,
    sourcingAlertChannels: w.sourcing_alert_channels,
    sourcingAlertActiveHourStart: w.sourcing_alert_active_hour_start,
    sourcingAlertActiveHourEnd: w.sourcing_alert_active_hour_end,
    sourcingAlertNotifyMode: w.sourcing_alert_notify_mode === "changes_only" ? "changes_only" : "always",
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHero
        badge="🔍 STEP 1 · 키워드 발굴"
        title="관심 키워드 등록"
        description="카테고리와 추적할 키워드를 등록하면 네이버 쇼핑인사이트 관심도를 바탕으로 기회점수를 계산합니다. 무엇을 등록할지 모르겠다면 아래 「카테고리로 후보 상품군 추천받기」를 먼저 써 보세요."
        tip="키워드마다 「예약 소싱 알림」을 켜 두면 정한 주기마다 소싱 후보를 알림으로 받아요."
      />

      {/* v1.11: 조회 오류면 빈 목록 대신 안내 — 빈 화면을 보고 키워드를 중복 등록하지 않게 */}
      {logLoadErrors("watchlist", { 관심키워드: { error: watchlistError } }).length ? (
        <LoadErrorNotice what="등록한 관심 키워드" retryHref="/watchlist" extra="목록이 비어 보여도 새로 등록하지 말고 먼저 다시 시도해 주세요." />
      ) : (
        <WatchlistWorkspace initialEntries={initialEntries} />
      )}
    </div>
  );
}
