import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { MyProducts } from "@/components/MyProducts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function MyProductsPage() {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);

  return (
    <div className="space-y-5">
      <PageHeader emoji="🗂" title="내 쿠팡 상품" description="쿠팡 WING에 등록된 내 상품을 상태·상품명으로 불러옵니다(읽기만, 쿠팡 상품은 바뀌지 않습니다)." />
      <Notice tone="tip">💡 한 번에 50개씩 불러오고, 더 있으면 「더 보기」가 나옵니다. 가격·재고 바꾸기는 다음 단계에서 이 목록에 붙습니다.</Notice>
      <MyProducts keysSaved={!!keys} />
    </div>
  );
}
