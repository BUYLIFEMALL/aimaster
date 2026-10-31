import { requireProgramAccess } from "@/lib/access";
import { alertStatus } from "@/lib/actions/dailyAlert";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { DailyAlertPanel } from "@/components/DailyAlertPanel";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AlertsPage() {
  const user = await requireProgramAccess();
  return (
    <div className="space-y-5">
      <PageHeader emoji="🔔" title="아침 요약 알림" description="매일 정한 시각에 처리할 건수를 내 텔레그램으로 받습니다." />
      <Notice tone="tip">내 텔레그램 봇과 내 cron-job.org 계정으로 돌아갑니다. 알림은 읽기만 하며, 주문·재고·가격을 자동으로 바꾸지 않습니다.</Notice>
      <DailyAlertPanel status={await alertStatus(user.id)} />
    </div>
  );
}
