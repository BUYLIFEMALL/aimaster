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
      <PageHeader emoji="🗂" title="내 쿠팡 상품" description="쿠팡 WING에 등록된 내 상품을 불러오고, 옵션별 판매가·재고·판매 상태를 관리합니다." />
      <Notice tone="tip">💡 한 번에 50개씩 불러오고, 더 있으면 「더 보기」가 나옵니다. 상품의 「옵션 관리」에서 옵션별 판매가·재고·판매 중지/재개를 바꿀 수 있습니다(바꾸기 전에 한 번 더 확인합니다).</Notice>
      <MyProducts keysSaved={!!keys} />
    </div>
  );
}
