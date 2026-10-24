import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { DEFAULT_INTERVAL_MINUTES } from "@/lib/schedule";
import ScheduleClient from "./ScheduleClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// ⏰ 예약 설정(인수인계 D7·D8): 켜기/끄기·수집 간격·동작 시간대. 판정·수집은 회원 PC 확장이 하고 서버는 값만 보관.
export default async function SchedulePage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data } = await supabase
    .from("realty_alert_settings")
    .select("schedule_enabled, interval_minutes, active_hour_start, active_hour_end")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="studio-shell">
      <StudioSidebar email={user.email ?? ""} active="schedule" />
      <main className="main">
        <div className="topline">
          <div>
            <div className="eyebrow">Step 2 · 예약 설정</div>
            <h1>⏰ 얼마나 자주 살펴볼까요?</h1>
            <p className="lede">크롬이 켜져 있는 동안 회원님 PC의 확장이 정한 간격마다 감시 대상을 살펴봅니다. 바꾸면 바로 저장돼요.</p>
          </div>
        </div>
        <ScheduleClient
          initial={{
            enabled: data?.schedule_enabled ?? false,
            intervalMinutes: data?.interval_minutes ?? DEFAULT_INTERVAL_MINUTES,
            startHour: data?.active_hour_start ?? null,
            endHour: data?.active_hour_end ?? null,
          }}
        />
      </main>
    </div>
  );
}
