import { requireProgramAccess } from "@/lib/access";
import { getCoupangDefaults, getWingKeyStatus } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { DefaultsForm } from "@/components/DefaultsForm";
import { RemoteFeeForm } from "@/components/RemoteFeeForm";
import { LogisticsPanel } from "@/components/LogisticsPanel";

export const dynamic = "force-dynamic";

export default async function DefaultsPage() {
  const user = await requireProgramAccess();
  const [defaults, keys] = await Promise.all([getCoupangDefaults(user.id), getWingKeyStatus(user.id)]);

  return (
    <div className="space-y-5">
      <PageHeader emoji="⚙" title="배송·반품 기본값" description="출고지·반품지·택배사·배송비처럼 상품마다 같은 값을 한 번만 넣어 둡니다." />
      <Notice tone="tip">
        💡 출고지·반품지는 아래 「출고지·반품지 만들기·고치기」에서도 만들 수 있습니다. 「쿠팡에서 불러오기」를 누르면 내 WING의 목록이 나옵니다(읽기만 하고 아무것도 바꾸지 않음).
      </Notice>
      <DefaultsForm initial={defaults} keysSaved={keys.saved} />
      <LogisticsPanel keysSaved={keys.saved} defaultCourier={defaults?.deliveryCompanyCode ?? ""} />
      <section className="slw-card space-y-2 p-5">
        <h2 className="text-base font-extrabold text-slate-900">🏝 제주·도서산간 추가배송비</h2>
        <p className="text-sm text-slate-600">쿠팡은 이 금액을 상품마다가 아니라 출고지마다 정합니다. 여기서 바꾸면 WING의 출고지 설정이 바뀝니다.</p>
        <RemoteFeeForm placeCode={defaults?.outboundShippingPlaceCode ?? ""} />
      </section>
    </div>
  );
}
