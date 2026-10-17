import { PageHero } from "@/components/ui/PageHero";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { LoadErrorNotice } from "@/components/ui/LoadErrorNotice";
import { logLoadErrors } from "@/lib/loadErrors";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { SourcingCalculator } from "@/components/sourcing/SourcingCalculator";
import { BatchMarginCalculator } from "@/components/sourcing/BatchMarginCalculator";
import { SavedProductsPanel } from "@/components/sourcing/SavedProductsPanel";
import type { SavedProductEntry } from "@/lib/actions/savedProducts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SourcingPage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string }>;
}) {
  const user = await requireProgramAccess();
  const { keyword } = await searchParams;

  // 회원이 이미 등록해둔 API 키가 있는 채널은 검색 체크박스가 자동으로 선택되게 한다
  // (매번 직접 체크할 필요 없게). 아무 키도 없으면 기존처럼 알리익스프레스만 기본 선택.
  const supabase = await createClient();
  const registered = await getRegisteredProviders(supabase, user.id);
  const registeredPlatforms: ("aliexpress" | "domeggook" | "elevenst")[] = [];
  if (
    registered.has("aliexpress_app_key") &&
    registered.has("aliexpress_app_secret") &&
    registered.has("aliexpress_tracking_id")
  ) {
    registeredPlatforms.push("aliexpress");
  }
  if (registered.has("domeggook_api_key")) registeredPlatforms.push("domeggook");
  if (registered.has("elevenst_api_key")) registeredPlatforms.push("elevenst");

  const { data: watchlist, error: watchlistError } = await supabase
    .from("trend_watchlist")
    .select("category_name, keywords")
    .eq("user_id", user.id)
    .order("category_name");
  const watchlistGroups = (watchlist ?? [])
    .filter((w) => w.keywords.length > 0)
    .map((w) => ({ categoryName: w.category_name, keywords: w.keywords }));

  const { data: savedProductRows, error: savedError } = await supabase
    .from("sourcing_saved_products")
    .select(
      "id, keyword, platform, title, detail_url, last_price_krw, last_status, last_checked_at, alert_interval_minutes, alert_channels, alert_enabled, active_hour_start, active_hour_end",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const savedProducts: SavedProductEntry[] = (savedProductRows ?? []).map((r) => ({
    id: r.id,
    keyword: r.keyword,
    platform: r.platform as SavedProductEntry["platform"],
    title: r.title,
    detailUrl: r.detail_url,
    lastPriceKrw: r.last_price_krw,
    lastStatus: r.last_status as SavedProductEntry["lastStatus"],
    lastCheckedAt: r.last_checked_at,
    alertIntervalMinutes: r.alert_interval_minutes,
    alertChannels: r.alert_channels,
    alertEnabled: r.alert_enabled,
    activeHourStart: r.active_hour_start,
    activeHourEnd: r.active_hour_end,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHero
        badge="🌏 STEP 3 · 소싱·마진계산"
        title="상품소싱 마진계산기"
        description="키워드로 알리익스프레스(해외)·도매매·11번가(국내) 소싱 후보를 검색하고, 관세·부가세·운송비·플랫폼 수수료까지 반영한 예상 마진을 바로 계산합니다. 트렌드 리포트의 「🌏 소싱」을 누르면 키워드가 자동으로 들어와요."
        tip="마음에 드는 상품은 ⭐ 관심상품으로 저장하면 가격 변동·품절을 알려 드려요."
      />

      {/* v1.11: 계산기는 DB 없이도 쓸 수 있어 그대로 두고, 관심 키워드·관심 상품 조회 실패만 안내 */}
      {(() => {
        const failed = logLoadErrors("sourcing", { "관심 키워드": { error: watchlistError }, "관심 상품": { error: savedError } });
        return failed.length > 0 ? (
          <LoadErrorNotice what={failed.join("·")} retryHref="/sourcing" extra="마진 계산기는 그대로 쓸 수 있습니다." />
        ) : null;
      })()}

      <SourcingCalculator initialKeyword={keyword} registeredPlatforms={registeredPlatforms} />

      <SavedProductsPanel products={savedProducts} />

      <BatchMarginCalculator watchlistGroups={watchlistGroups} registeredPlatforms={registeredPlatforms} />
    </div>
  );
}
