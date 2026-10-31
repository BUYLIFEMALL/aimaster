import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { StockCheck } from "@/components/StockCheck";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function StockPage() {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);

  return (
    <div className="space-y-5">
      <PageHeader emoji="📉" title="품절 예방" description="승인된 상품의 옵션 재고를 점검해 품절·부족 옵션을 모아 보고, 재고를 바로 채웁니다." />
      <Notice tone="tip">💡 쿠팡은 옵션마다 따로 조회해야 해서, 버튼을 누를 때만 상품 20개씩 점검합니다. 여기 숫자는 점검한 순간의 값이니 재고를 바꾸기 전에 서버가 쿠팡에서 다시 읽어 확인합니다.</Notice>
      <StockCheck keysSaved={!!keys} />
    </div>
  );
}
