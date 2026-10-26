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
      <PageHeader emoji="⚙" title="스토어 기본값" description="상품마다 같은 값은 여기 한 번만 넣어 두면 모든 상품 등록에 함께 쓰입니다." />
      <Notice tone="tip">
        💡 배송·반품은 스마트스토어센터 「상품관리 → 템플릿 관리」에 저장해 둔 <b>템플릿 이름</b>을 적으면, 확장이 그 템플릿을 고릅니다. 칸을 하나하나 채우는 것보다 실패가 적습니다.
      </Notice>
      <DefaultsForm initial={defaults} />
    </div>
  );
}
