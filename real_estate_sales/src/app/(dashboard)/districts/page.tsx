import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ALL_DISTRICTS, SIDO_GROUPS, groupByCity } from "@/lib/publicdata/districts";
import { DistrictSearch } from "@/components/districts/DistrictSearch";
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
        description="관심 있는 전국 지역(구·시·군)을 고르면, 그 지역에 새 실거래가 신고될 때마다 알려 드려요. 여러 개 고를 수 있어요."
        tip={`지금 ${watchMap.size}개 지역 선택됨 · 「지금 조회하기」나 예약 조회로 실거래를 가져옵니다.`}
      />
      <div className="mb-6" />
      <DistrictSearch
        districts={SIDO_GROUPS.flatMap((g) => g.districts.map((d) => ({ ...d, sido: g.sido })))}
        activeCodes={[...watchMap.keys()]}
      />
      {/* 시·도별 묶음(2026-10-31 전국). 서울 밖은 국토부 실거래·전월세 자료 */}
      {SIDO_GROUPS.map((g) => {
        const picked = g.districts.filter((d) => watchMap.has(d.sgg_cd)).length;
        return (
          <details key={g.sido} className="mx-card mb-4" open={g.sido === "서울" || picked > 0}>
            <summary className="mx-section-title cursor-pointer">
              {g.sido}{" "}
              <small className="text-sm font-normal text-mx-muted">
                {g.districts.length}곳{picked ? ` · ${picked}곳 선택` : ""}
                {g.sido === "서울" ? "" : " · 국토부 실거래 자료"}
              </small>
            </summary>
            {/* 경기는 구가 여러 개인 시(수원·성남·안양·부천·안산·고양·용인)를 시 이름으로 묶고, 나머지 시·군은 한 묶음(2026-10-30) */}
            {groupByCity(g.districts).map((cg, _, all) => (
              <div key={cg.city ?? "rest"} className="mt-3">
                {all.length > 1 && (
                  <p className="mb-1 text-xs font-semibold text-mx-muted">{cg.city ?? "그 밖의 시·군"}</p>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                  {cg.items.map((d) => (
                    <DistrictToggle
                      key={d.sgg_cd}
                      sggCd={d.sgg_cd}
                      sggNm={d.sgg_nm}
                      isActive={watchMap.has(d.sgg_cd)}
                    />
                  ))}
                </div>
              </div>
            ))}
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
            <p className="mt-3 text-xs text-mx-muted">
              ℹ️ 한 번 조회할 때 지역마다 새 실거래를 최대 20건까지 가져와요. 거래가 많은 지역은 나머지를 다음 조회 때 이어서 가져오니,
              한 번에 다 보이지 않아도 정상이에요. 거래가 아주 많으면 오래된 거래 일부는 빠질 수 있어요.
            </p>
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
