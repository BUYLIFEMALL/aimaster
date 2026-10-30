import { requireProgramAccess } from "@/lib/access";
import { getCoupangDefaults, getWingKeys } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { OrderSheets } from "@/components/OrderSheets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const user = await requireProgramAccess();
  const [keys, defaults] = await Promise.all([getWingKeys(user.id), getCoupangDefaults(user.id)]);

  return (
    <div className="space-y-5">
      <PageHeader emoji="🚚" title="주문(발주서)" description="쿠팡에 들어온 주문을 상태·기간별로 불러옵니다. 결제완료 주문은 「상품준비중」으로 바꾸고, 상품준비중 주문은 송장을 넣어 배송지시로 넘깁니다(배송지시 이후엔 송장 수정)." />
      <Notice tone="tip">💡 쿠팡은 한 번에 31일까지 조회할 수 있고, 50건씩 불러옵니다. 주문자·수취인 정보는 화면에만 보이고 우리 서버에 저장하지 않습니다(전화번호는 안심번호만 보입니다).</Notice>
      <OrderSheets keysSaved={!!keys} defaultCourier={defaults?.deliveryCompanyCode ?? ""} initialStatus={status ?? ""} />
    </div>
  );
}
