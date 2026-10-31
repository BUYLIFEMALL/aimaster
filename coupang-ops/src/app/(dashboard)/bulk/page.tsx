import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { BulkEditor } from "@/components/BulkEditor";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function BulkPage() {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  return (
    <div className="space-y-5">
      <PageHeader emoji="🧮" title="일괄 가격·재고" description="옵션을 골라 가격과 재고를 한 번에 바꿉니다. 바뀔 값을 미리 보고 확인한 뒤 적용합니다." />
      <Notice tone="tip">판매가는 10원 단위로 맞추며, 한 번에 지금 가격의 50% 인하부터 100% 인상까지만 됩니다. 한 번에 30개까지 바꿀 수 있고, 옵션마다 쿠팡에서 지금 값을 다시 읽은 뒤 보냅니다.</Notice>
      <BulkEditor keysSaved={!!keys} />
    </div>
  );
}
