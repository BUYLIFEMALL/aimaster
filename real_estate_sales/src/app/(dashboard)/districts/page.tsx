import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ALL_DISTRICTS, SIDO_GROUPS, groupByCity } from "@/lib/publicdata/districts";
import { DistrictSearch } from "@/components/districts/DistrictSearch";
import { DistrictToggle } from "@/components/districts/DistrictToggle";
import { MonitoringSettings } from "@/components/districts/MonitoringSettings";
import { QueryNowButton } from "@/components/districts/QueryNowButton";
import { PageHero } from "@/components/ui/PageHero";
import { createAdminClient } from "@/lib/supabase/admin";
import { tradeVolumeTrends } from "@/lib/realestate/collect";
import { recentMonths, ymLabel } from "@/lib/realestate/insights";
import { suggestFromOtherPrograms, type CommercialWatchRow, type ListingTargetRow } from "@/lib/realestate/crossWatch";

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
  // 연계(2026-11-19): 상가·매물 알림에 등록한 지역을 제안만(자동 등록 없음). 회원 세션 + 본인 행 RLS로 읽기만, 실패해도 화면은 그대로
  // 켜짐 판정(상가 is_active·매물 알림 enabled+region)은 순수 함수 안에서 — 각 프로그램 수집 조건과 같게
  const loose = supabase as unknown as { from: (t: string) => { select: (c: string) => PromiseLike<{ data: Record<string, string | boolean | null>[] | null }> } };
  const [commercialRes, listingRes] = await Promise.all([
    loose.from("commercial_land_watch").select("sgg_cd, is_active").then((r) => r, () => ({ data: null })),
    loose.from("realty_alert_targets").select("cortar_no, target_type, enabled").then((r) => r, () => ({ data: null })),
  ]);
  const crossSuggestions = suggestFromOtherPrograms({
    own: watchMap.keys(),
    commercial: (commercialRes.data ?? []) as unknown as CommercialWatchRow[],
    listing: (listingRes.data ?? []) as unknown as ListingTargetRow[],
    known: ALL_DISTRICTS,
  });
  // A2(2026-11-02): 관심 지역 달별 매매 신고 건수. 공공 집계라 회원 정보가 없고 서버 키로 읽는다
  const volumes = await tradeVolumeTrends(createAdminClient(), [...watchMap.keys()]).catch(() => ({}) as Awaited<ReturnType<typeof tradeVolumeTrends>>);
  const months = recentMonths(new Date(), 6).slice(1).reverse(); // 지난달까지 5개월. 지난달은 아직 신고 중(계약 후 30일)이라 비교에서 뺀다
  const reporting = months[months.length - 1];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="📍 STEP 1 · 관심 지역"
        title="관심 지역 설정"
        description="관심 있는 전국 지역(구·시·군)을 고르면, 그 지역에 새 실거래가 신고될 때마다 알려 드려요. 여러 개 고를 수 있어요."
        tip={`지금 ${watchMap.size}개 지역 선택됨 · 「지금 조회하기」나 예약 조회로 실거래를 가져옵니다.`}
      />
      <div className="mb-6" />
      {crossSuggestions.length > 0 && (
        <section className="mx-card mb-6 p-4">
          <h2 className="text-sm font-bold text-mx-text">🔗 다른 부동산 프로그램에 등록한 지역</h2>
          <p className="mt-1 text-xs text-mx-muted">상가·매물 알림에서 감시 중인데 여기엔 아직 없는 지역이에요. 누르면 이 지역 실거래도 받아요(자동으로 추가하지 않아요).</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {crossSuggestions.map((s) => (
              <div key={s.sgg_cd}>
                <DistrictToggle sggCd={s.sgg_cd} sggNm={s.sgg_nm} isActive={false} />
                <p className="mt-1 text-center text-[11px] text-mx-muted">{s.sources.join(" · ")}에 등록</p>
              </div>
            ))}
          </div>
        </section>
      )}
      {watchMap.size > 0 && (
        <section className="mx-card mb-6 p-4">
          <h2 className="text-sm font-bold text-mx-text">📊 관심 지역 매매 신고 건수</h2>
          {Object.keys(volumes).length === 0 ? (
            <p className="mt-2 text-xs text-mx-muted">조회하면 지역마다 최근 달 건수를 모읍니다. 몇 번 조회한 뒤부터 보여요.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-mx-muted">
                    <th className="py-1 text-left">지역</th>
                    {months.map((m) => <th key={m} className="py-1 text-right">{ymLabel(m)}{m === reporting ? "(신고 중)" : ""}</th>)}
                    <th className="py-1 text-right">신고 끝난 달 / 그 전 3개월 평균</th>
                    <th className="py-1 text-right">포함 유형</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(volumes).map(([sgg, v]) => (
                    <tr key={sgg} className="border-t border-mx-border">
                      <td className="py-1 text-mx-text">{ALL_DISTRICTS.find((d) => d.sgg_cd === sgg)?.sgg_nm ?? sgg}</td>
                      {months.map((m) => <td key={m} className="py-1 text-right tabular-nums text-mx-muted">{v.months[m] ?? "-"}</td>)}
                      <td className="py-1 text-right tabular-nums">{v.rising ? "🔥 " : ""}{ymLabel(v.ym)} {v.last} / {v.avg}</td>
                      <td className="py-1 text-right text-xs text-mx-muted">{v.types.join("·")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-mx-muted">국토교통부 실거래 신고 건수(공공 자료)입니다. 계약 후 30일 안에 신고하므로 지난달은 아직 늘어나는 중이에요. 그래서 신고가 끝난 달을 그 전 3개월 평균과 비교해, 30% 넘게 많고 10건 이상이면 🔥로 표시하고 알림에도 한 줄 붙여요. 처음 며칠은 유형별 건수를 나눠 모으는 중이라 「포함 유형」에 든 것만 더해요. 해제·정정 신고는 늦게 반영될 수 있어요.</p>
          <a href="https://commercial-land-trade-alert.buylife.xyz/watch" className="mt-2 inline-block text-xs font-semibold text-mx-link underline">🏬 이 지역 상가·건물·토지 매물도 감시하기 →</a>
        </section>
      )}
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
