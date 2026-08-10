import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SEOUL_DISTRICTS } from "@/lib/publicdata/districts";
import { DistrictToggle } from "@/components/districts/DistrictToggle";
import { MonitoringSettings } from "@/components/districts/MonitoringSettings";

export default async function DistrictsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: watches } = await supabase
    .from("real_estate_watch_districts")
    .select(
      "sgg_cd, is_active, monitoring_enabled, collect_interval_minutes, active_hour_start, active_hour_end",
    )
    .eq("user_id", user.id)
    .eq("is_active", true);

  const watchMap = new Map((watches ?? []).map((w) => [w.sgg_cd, w]));

  return (
    <div>
      <h1 className="gold-text mb-2 text-2xl font-semibold">관심 지역 설정</h1>
      <p className="mb-6 text-sm text-neutral-400">
        관심 있는 자치구를 선택하면, 그 지역에 새 실거래 매물이 올라올 때마다 알려드려요.
        여러 개 선택할 수 있어요.
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {SEOUL_DISTRICTS.map((d) => (
          <DistrictToggle
            key={d.sgg_cd}
            sggCd={d.sgg_cd}
            sggNm={d.sgg_nm}
            isActive={watchMap.has(d.sgg_cd)}
          />
        ))}
      </div>

      {watchMap.size > 0 && (
        <div className="mt-8">
          <h2 className="mb-1 text-lg font-medium text-neutral-100">실시간 모니터링</h2>
          <p className="mb-4 text-sm text-neutral-400">
            켜둔 지역만 설정한 주기로 자동 수집 → AI 분석 → 텔레그램 발송까지 진행돼요. 꺼두면
            아무 것도 자동으로 실행되지 않아 AI 분석 비용이 들지 않아요.
          </p>
          <div className="space-y-3">
            {SEOUL_DISTRICTS.filter((d) => watchMap.has(d.sgg_cd)).map((d) => {
              const w = watchMap.get(d.sgg_cd)!;
              return (
                <MonitoringSettings
                  key={d.sgg_cd}
                  sggCd={d.sgg_cd}
                  sggNm={d.sgg_nm}
                  monitoringEnabled={w.monitoring_enabled}
                  intervalMinutes={w.collect_interval_minutes}
                  activeHourStart={w.active_hour_start}
                  activeHourEnd={w.active_hour_end}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
