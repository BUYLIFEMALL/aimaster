import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SIDO_GROUPS, groupByCity } from "@/lib/publicdata/districts";
import { DistrictSearch } from "@/components/districts/DistrictSearch";
import { DistrictToggle } from "@/components/districts/DistrictToggle";
import { PageHero } from "@/components/ui/PageHero";
import { TradeTabs } from "@/components/trades/TradeTabs";

export default async function DistrictsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: watches } = await supabase.from("commercial_land_watch").select("sgg_cd").eq("user_id", user.id).eq("is_active", true);
  const active = new Set(((watches ?? []) as { sgg_cd: string }[]).map((w) => w.sgg_cd));

  const collecting = SIDO_GROUPS.flatMap((g) => g.districts.filter((d) => active.has(d.sgg_cd)));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="📍 STEP 4 · 실거래 내역 · 지역 추가"
        title="실거래 지역 추가"
        description="서버가 국토부 공개 자료를 지역마다 하루 1회 자동으로 받아 옵니다. 매물 감시에 등록한 지역은 자동으로 켜지므로 보통은 손댈 필요가 없습니다."
        tip={`지금 ${active.size}곳 수집 중 · 새로 고른 지역은 보통 5~10분 안에 첫 자료가 들어옵니다.`}
      />
      <TradeTabs active="districts" />
      <p className="mt-3 rounded-xl border border-mx-border bg-white p-3 text-sm text-mx-muted">💡 여기서는 이미 계약된 <b>실거래</b>만 받습니다. 지금 나와 있는 <b>매물</b>을 보려면 1번 「매물 감시(예약 설정)」에 지역을 등록해 주세요.</p>
      <section className="mx-card mt-4">
        <h2 className="mx-section-title">📡 지금 수집 중인 지역</h2>
        {collecting.length === 0 ? (
          <p className="text-sm text-mx-muted">아직 없습니다. 매물 감시에 지역을 등록하거나 아래에서 추가해 주세요.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {collecting.map((d) => (
                <DistrictToggle key={d.sgg_cd} sggCd={d.sgg_cd} sggNm={d.sgg_nm} isActive />
              ))}
            </div>
            <p className="mt-2 text-xs text-mx-muted">누르면 수집을 끕니다. 끈 지역은 시세 비교와 실거래 알림에서 빠집니다.</p>
          </>
        )}
      </section>
      <details className="mt-4" open={collecting.length === 0}>
        <summary className="mx-card cursor-pointer text-sm font-bold">➕ 다른 지역 추가하기 (매물 감시 없이 실거래만 볼 때)</summary>
        <div className="mt-4">
          <DistrictSearch districts={SIDO_GROUPS.flatMap((g) => g.districts.map((d) => ({ ...d, sido: g.sido })))} activeCodes={[...active]} />
        {SIDO_GROUPS.map((g) => {
          const picked = g.districts.filter((d) => active.has(d.sgg_cd)).length;
          return (
            <details key={g.sido} className="mx-card mb-4" open={picked > 0}>
              <summary className="mx-section-title cursor-pointer">
                {g.sido}{" "}
                <small className="text-sm font-normal text-mx-muted">
                  {g.districts.length}곳{picked ? ` · ${picked}곳 선택` : ""}
                </small>
              </summary>
              {groupByCity(g.districts).map((cg, _, all) => (
                <div key={cg.city ?? "rest"} className="mt-3">
                  {all.length > 1 && <p className="mb-1 text-xs font-semibold text-mx-muted">{cg.city ?? "그 밖의 시·군"}</p>}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                    {cg.items.map((d) => (
                      <DistrictToggle key={d.sgg_cd} sggCd={d.sgg_cd} sggNm={d.sgg_nm} isActive={active.has(d.sgg_cd)} />
                    ))}
                  </div>
                </div>
              ))}
            </details>
          );
        })}
        </div>
      </details>
    </div>
  );
}
