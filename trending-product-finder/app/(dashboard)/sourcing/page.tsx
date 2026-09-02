import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { SourcingCalculator } from "@/components/sourcing/SourcingCalculator";
import { BatchMarginCalculator } from "@/components/sourcing/BatchMarginCalculator";

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

  const { data: watchlist } = await supabase
    .from("trend_watchlist")
    .select("category_name, keywords")
    .eq("user_id", user.id)
    .order("category_name");
  const watchlistGroups = (watchlist ?? [])
    .filter((w) => w.keywords.length > 0)
    .map((w) => ({ categoryName: w.category_name, keywords: w.keywords }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <section>
        <h1 className="mb-2 text-2xl font-black text-gray-900">상품소싱 마진계산기</h1>
        <p className="text-sm text-gray-500">
          키워드로 알리익스프레스(해외)·도매매(국내) 소싱 후보를 검색하고, 관세·부가세·운송비·
          플랫폼 수수료까지 반영한 예상 마진을 바로 계산해볼 수 있습니다. 트렌드 리포트에서
          발굴한 키워드를 이 페이지로 가져와서 바로 원가를 확인해보세요.
        </p>
      </section>

      <SourcingCalculator initialKeyword={keyword} registeredPlatforms={registeredPlatforms} />

      <BatchMarginCalculator watchlistGroups={watchlistGroups} registeredPlatforms={registeredPlatforms} />
    </div>
  );
}
