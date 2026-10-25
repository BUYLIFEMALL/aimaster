import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import RecentResults from "@/app/dashboard/RecentResults";
import DailyUsage from "@/app/dashboard/DailyUsage";
import StatsDashboard from "./StatsDashboard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 📄 수집 결과(2026-10-25): 표는 이 브라우저의 확장이 PC 안에서 직접 건넨다(서버 미보관, §0). 서버에서는 마지막 수집 숫자만 읽는다.
export default async function ResultsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: device } = await supabase
    .from("realty_alert_device_status")
    .select("last_run_at, last_result, last_count")
    .eq("user_id", user.id)
    .order("last_run_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="studio-shell">
      <StudioSidebar email={user.email ?? ""} active="results" />
      <main className="main">
        <div className="topline">
          <div>
            <div className="eyebrow">Step 4 · 수집 결과</div>
            <h1>📄 최근 수집 결과</h1>
            <p className="lede">위에는 통계·추이를, 아래에는 확장이 마지막으로 살펴본 매물 표를 보여 드려요. 매물 정보와 통계 기록은 회원님 PC 안에서만 오가요.</p>
          </div>
        </div>
        <StatsDashboard email={user.email ?? ""} />
        <DailyUsage />
        <RecentResults email={user.email ?? ""} summary={{ lastRunAt: device?.last_run_at ?? null, lastCount: device?.last_count ?? null, lastResult: device?.last_result ?? null }} />
      </main>
    </div>
  );
}
