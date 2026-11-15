import { requireProgramAccess } from "@/lib/access";
import { getDefaults } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { DefaultsForm } from "@/components/DefaultsForm";

export const dynamic = "force-dynamic";

export default async function DefaultsPage() {
  const user = await requireProgramAccess();
  const defaults = await getDefaults(user.id);
  return (
    <div className="space-y-4">
      <PageHeader emoji="⚙" title="ESM+ 기본값" description="상품마다 같은 값은 여기 한 번만 넣어 두면 모든 상품 등록에 함께 쓰입니다." />
      <Notice tone="tip">
        💡 택배사·출고지·배송비 정책·반품지는 ESM+ 「판매자정보 → 배송정보관리」에 먼저 만들어 두고, 여기에는 그 <b>이름·번호를 그대로</b> 적어 주세요. 확장은 고르기만 하고 새로 만들지 않습니다.
      </Notice>
      <DefaultsForm initial={defaults} />
    </div>
  );
}
