import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { WatchlistWorkspace } from "@/components/watchlist/WatchlistWorkspace";
import type { WatchlistEntry } from "@/lib/actions/watchlist";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function WatchlistPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: watchlist } = await supabase
    .from("trend_watchlist")
    .select(
      "id, category_name, naver_category_code, keywords, is_active, sourcing_alert_enabled, sourcing_alert_interval_minutes, sourcing_alert_channels, sourcing_alert_active_hour_start, sourcing_alert_active_hour_end",
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
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <section>
        <h1 className="mb-2 text-2xl font-black text-gray-900">관심 키워드 등록</h1>
        <p className="mb-6 text-sm text-gray-500">
          카테고리와 추적하고 싶은 키워드를 등록해두면, 네이버클라우드 API HUB 쇼핑인사이트(관심도
          추이)를 기반으로 기회 점수를 계산해드립니다. 어떤 키워드를 등록할지 모르겠다면 아래
          &quot;카테고리로 후보 상품군 추천받기&quot;를 먼저 써보세요.
        </p>
      </section>

      <WatchlistWorkspace initialEntries={initialEntries} />
    </div>
  );
}
