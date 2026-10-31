import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { CouponBoard } from "@/components/CouponBoard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CouponsPage() {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  return (
    <div className="space-y-5">
      <PageHeader emoji="🎟" title="쿠폰" description="쿠폰 계약과 예산을 확인하고, 즉시할인·다운로드 쿠폰을 만들어 옵션에 적용합니다." />
      <Notice tone="tip">즉시할인 쿠폰은 내일 0시부터, 다운로드 쿠폰은 1시간 뒤부터 시작할 수 있습니다. 쿠팡이 순서대로 처리하므로 요청 뒤 「처리 결과 확인」으로 결과를 봅니다. 다운로드 쿠폰 목록은 여기 나오지 않으니 WING에서 확인해 주세요.</Notice>
      <CouponBoard keysSaved={!!keys} />
    </div>
  );
}
