import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ALL_DISTRICTS, SIDO_GROUPS, groupByCity } from "@/lib/publicdata/districts";
import { suggestFromOtherPrograms, type ListingTargetRow, type SalesWatchRow } from "@/lib/crossWatch";
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
  // 연계 2단계(2026-11-19): 실거래·매물 알림에 켜 둔 지역을 제안만(자동 등록 없음). 회원 세션 + 본인 행 RLS로 읽기만, 실패해도 화면은 그대로.
  // 켜짐 판정(실거래 is_active·매물 알림 region+enabled)은 순수 함수 안에서 — 각 프로그램 수집 조건과 같게
  const loose = supabase as unknown as { from: (t: string) => { select: (c: string) => PromiseLike<{ data: Record<string, string | boolean | null>[] | null }> } };
  const [salesRes, listingRes] = await Promise.all([
    loose.from("real_estate_watch_districts").select("sgg_cd, is_active").then((r) => r, () => ({ data: null })),
    loose.from("realty_alert_targets").select("cortar_no, target_type, enabled").then((r) => r, () => ({ data: null })),
  ]);
  const crossSuggestions = suggestFromOtherPrograms({
    own: active,
    sales: (salesRes.data ?? []) as unknown as SalesWatchRow[],
    listing: (listingRes.data ?? []) as unknown as ListingTargetRow[],
    known: ALL_DISTRICTS,
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="📍 STEP 4 · 실거래 내역 · 지역 추가"
        title="실거래 지역 추가"
        description="서버가 국토부 공개 자료를 지역마다 하루 1회 자동으로 받아 옵니다. 매물 감시에 등록한 지역은 자동으로 켜지므로 보통은 손댈 필요가 없습니다."
        tip={`지금 ${active.size}곳 수집 중 · 새로 고른 지역은 보통 5~10분 안에 첫 자료가 들어옵니다.`}
      />
      <TradeTabs active="districts" />
      <p className="mt-3 rounded-xl border border-[#1E293B] bg-[#121824] p-3 text-sm text-gray-300">💡 여기서는 이미 계약된 <b>실거래</b>만 받습니다. 지금 나와 있는 <b>매물</b>을 보려면 1번 「매물 감시(예약 설정)」에 지역을 등록해 주세요.</p>
      {crossSuggestions.length > 0 && (
        <section className="mx-card mt-4">
          <h2 className="mx-section-title">🔗 다른 부동산 프로그램에 등록한 지역</h2>
          <p className="mb-3 text-xs text-mx-muted">실거래·매물 알림에서 켜 둔 지역인데 여기엔 아직 없어요. 누르면 이 지역 상가·건물·토지 실거래도 받아요(자동으로 추가하지 않아요).</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {crossSuggestions.map((s) => (
              <div key={s.sgg_cd}>
                <DistrictToggle sggCd={s.sgg_cd} sggNm={s.sgg_nm} isActive={false} />
                <p className="mt-1 text-center text-[11px] text-mx-muted">{s.sources.join(" · ")}에 등록</p>
              </div>
            ))}
          </div>
        </section>
      )}
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
