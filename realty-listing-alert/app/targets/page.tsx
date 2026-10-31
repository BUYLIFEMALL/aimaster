import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import TargetsClient, { type TargetRow } from "./TargetsClient";
import { DEFAULT_INTERVAL_MINUTES } from "@/lib/schedule";
import ScheduleClient from "../schedule/ScheduleClient";
import WeeklyReportCard from "../schedule/WeeklyReportCard";
import LimitNotice from "@/components/LimitNotice";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 실거래 프로그램(real-estate-sales) 「이 단지 매물 알림 받기」 버튼이 ?name=단지명&region=지역 으로 보낸다.
// 실거래 자료에는 네이버 단지 번호가 없으므로(우리 서버는 네이버에 요청하지 않음) 이름만 미리 채우고 주소는 회원이 붙여 넣는다.
function cleanParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v ?? "").trim().slice(0, 100);
}

// 🎯 매물 감시(예약 설정): 단지 추가·조건·대상별 켜기/끄기·삭제(최대 10개)와 수집 예약을 한 화면에서.
export default async function TargetsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const prefillName = cleanParam(sp.name);
  const prefill = prefillName ? { name: prefillName, region: cleanParam(sp.region) } : null;
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const [{ data }, { data: settings }] = await Promise.all([
    supabase
      .from("realty_alert_targets")
      .select("id, complex_no, complex_name, target_type, cortar_no, region_name, region_max_complexes, trade_types, price_min, price_max, area_min, area_max, enabled, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("realty_alert_settings")
      .select("schedule_enabled, interval_minutes, active_hour_start, active_hour_end, notify_weekly, weekly_day")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <div className="studio-shell">
      <StudioSidebar email={user.email ?? ""} active="targets" />
      <main className="main">
        <div className="topline">
          <div>
            <div className="eyebrow">Step 1 · 매물 감시(예약 설정)</div>
            <h1>🎯 감시할 단지를 정해 주세요</h1>
            <p className="lede">네이버 부동산에서 단지를 열고 초록 버튼 한 번만 누르면 추가돼요. 최대 10곳까지 등록하고, 단지마다 켜고 끌 수 있어요.</p>
          </div>
        </div>
        <TargetsClient initialTargets={(data ?? []) as TargetRow[]} prefill={prefill} />
        <div id="schedule" style={{ scrollMarginTop: 24, marginTop: 32 }}>
          <h2>⏰ 얼마나 자주 살펴볼까요?</h2>
          <p className="lede">크롬이 켜져 있는 동안 회원님 PC의 확장이 정한 간격마다 감시 대상을 살펴봅니다. 바꾸면 바로 저장돼요.</p>
        </div>
        <ScheduleClient
          targets={data ?? []}
          initial={{
            enabled: settings?.schedule_enabled ?? false,
            intervalMinutes: settings?.interval_minutes ?? DEFAULT_INTERVAL_MINUTES,
            startHour: settings?.active_hour_start ?? null,
            endHour: settings?.active_hour_end ?? null,
          }}
        />
        <WeeklyReportCard initial={{ enabled: settings?.notify_weekly ?? false, day: settings?.weekly_day ?? 1 }} />
        <LimitNotice />
      </main>
    </div>
  );
}
