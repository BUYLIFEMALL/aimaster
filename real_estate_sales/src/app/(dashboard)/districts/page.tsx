import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ALL_DISTRICTS, SIDO_GROUPS } from "@/lib/publicdata/districts";
import { DistrictToggle } from "@/components/districts/DistrictToggle";
import { MonitoringSettings } from "@/components/districts/MonitoringSettings";
import { QueryNowButton } from "@/components/districts/QueryNowButton";
import { PageHero } from "@/components/ui/PageHero";

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
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="📍 STEP 1 · 관심 지역"
        title="관심 지역 설정"
        description="관심 있는 서울·경기·인천 지역(구·시·군)을 고르면, 그 지역에 새 실거래가 신고될 때마다 알려 드려요. 여러 개 고를 수 있어요."
        tip={`지금 ${watchMap.size}개 지역 선택됨 · 「지금 조회하기」나 예약 조회로 실거래를 가져옵니다.`}
      />
      <div className="mb-6" />
      {/* RE-B4(2026-10-30): 서울·경기·인천 묶음. 경기·인천은 국토부 실거래 자료(전월세 비교는 서울만) */}
      {SIDO_GROUPS.map((g) => {
        const picked = g.districts.filter((d) => watchMap.has(d.sgg_cd)).length;
        return (
          <details key={g.sido} className="mx-card mb-4" open={g.sido === "서울" || picked > 0}>
            <summary className="mx-section-title cursor-pointer">
              {g.sido}{" "}
              <small className="text-sm font-normal text-mx-muted">
                {g.districts.length}곳{picked ? ` · ${picked}곳 선택` : ""}
                {g.sido === "서울" ? "" : " · 국토부 실거래 자료(전월세 비교는 서울만)"}
              </small>
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {g.districts.map((d) => (
                <DistrictToggle
                  key={d.sgg_cd}
                  sggCd={d.sgg_cd}
                  sggNm={d.sgg_nm}
                  isActive={watchMap.has(d.sgg_cd)}
                />
              ))}
            </div>
          </details>
        );
      })}

      {watchMap.size > 0 && (
        <>
          <div className="mx-card mt-8">
            <h2 className="mx-section-title mb-1">⚡ 실거래가 조회</h2>
            <p className="mb-4 text-sm text-mx-muted">
              버튼을 누르면 선택한 지역의 최근 실거래를 바로 조회해서 AI 분석까지 마친 뒤,
              연동해둔 텔레그램으로 결과를 보내드려요. 필요할 때마다 직접 눌러서 받아보는
              기본 방식이에요.
            </p>
            <QueryNowButton />
          </div>

          <div className="mx-card mt-8">
            <h2 className="mx-section-title mb-1">⏰ 예약 조회 (선택)</h2>
            <p className="mb-4 text-sm text-mx-muted">
              매번 직접 누르지 않아도, 정해둔 주기·시간대에 자동으로 조회해서 텔레그램으로
              받아보고 싶다면 지역별로 켜두세요. 꺼두면 위 &quot;지금 조회하기&quot; 버튼으로만
              동작하고 자동으로는 아무 것도 실행되지 않아요.
            </p>
            <div className="space-y-3">
              {ALL_DISTRICTS.filter((d) => watchMap.has(d.sgg_cd)).map((d) => {
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
        </>
      )}
    </div>
  );
}
