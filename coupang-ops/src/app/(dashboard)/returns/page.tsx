import { requireProgramAccess } from "@/lib/access";
import { getCoupangDefaults, getWingKeys } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { ReturnRequests } from "@/components/ReturnRequests";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ReturnsPage() {
  const user = await requireProgramAccess();
  const [keys, defaults] = await Promise.all([getWingKeys(user.id), getCoupangDefaults(user.id)]);

  return (
    <div className="space-y-5">
      <PageHeader emoji="↩" title="출고중지·취소" description="고객이 보낸 출고중지 요청과 반품 접수를 확인하고, 보내지 않았으면 출고중지 완료, 이미 보냈으면 이미출고로 처리합니다." />
      <Notice tone="tip">💡 쿠팡은 「발송 전에 출고중지 요청을 꼭 확인」하라고 안내합니다. 송장을 등록할 때도 출고중지 요청이 걸린 주문은 자동으로 막습니다. 신청인 이름·연락처·주소는 읽지 않습니다.</Notice>
      <ReturnRequests keysSaved={!!keys} defaultCourier={defaults?.deliveryCompanyCode ?? ""} />
    </div>
  );
}
