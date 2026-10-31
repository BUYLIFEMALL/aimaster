import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { RevenueReport } from "@/components/RevenueReport";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function RevenuePage() {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);

  return (
    <div className="space-y-5">
      <PageHeader emoji="📊" title="매출·정산" description="쿠팡 실제 정산 값으로 옵션별 수수료와 순이익을 계산하고, 지급 내역을 확인합니다." />
      <Notice tone="tip">💡 매출과 지급 내역은 화면에만 보이고 서버에 저장하지 않습니다. 계좌 정보는 읽지 않습니다. 원가·목표 이익률은 이 브라우저에만 저장되어 다른 기기에서는 다시 넣어야 합니다.</Notice>
      <RevenueReport keysSaved={!!keys} />
    </div>
  );
}
