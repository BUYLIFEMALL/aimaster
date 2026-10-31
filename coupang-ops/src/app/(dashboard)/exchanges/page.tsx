import { requireProgramAccess } from "@/lib/access";
import { getCoupangDefaults, getWingKeys } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { ExchangeRequests } from "@/components/ExchangeRequests";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ExchangesPage() {
  const user = await requireProgramAccess();
  const [keys, defaults] = await Promise.all([getWingKeys(user.id), getCoupangDefaults(user.id)]);

  return (
    <div className="space-y-5">
      <PageHeader emoji="🔄" title="교환" description="교환 요청을 확인하고 입고 확인, 교환 송장 등록, 거부를 처리합니다." />
      <Notice tone="tip">💡 순서: 고객 반송 상품 도착 → 입고 확인 → 최대 10분 뒤 교환 송장 등록. 거부는 쿠팡이 허용한 두 경우(교환 상품 품절, 고객 철회)만 됩니다.</Notice>
      <ExchangeRequests keysSaved={!!keys} defaultCourier={defaults?.deliveryCompanyCode ?? ""} />
    </div>
  );
}
