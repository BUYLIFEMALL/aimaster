import { requireProgramAccess } from "@/lib/access";
import { getCoupangDefaults, getWingKeyStatus } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { DefaultsForm } from "@/components/DefaultsForm";

export const dynamic = "force-dynamic";

export default async function DefaultsPage() {
  const user = await requireProgramAccess();
  const [defaults, keys] = await Promise.all([getCoupangDefaults(user.id), getWingKeyStatus(user.id)]);

  return (
    <div className="space-y-5">
      <PageHeader emoji="⚙" title="배송·반품 기본값" description="출고지·반품지·택배사·배송비처럼 상품마다 같은 값을 한 번만 넣어 둡니다." />
      <Notice tone="tip">
        💡 출고지·반품지는 WING에 먼저 만들어 두어야 합니다. 「쿠팡에서 불러오기」를 누르면 내 WING의 목록이 나옵니다(읽기만 하고 아무것도 바꾸지 않음).
      </Notice>
      <DefaultsForm initial={defaults} keysSaved={keys.saved} />
    </div>
  );
}
