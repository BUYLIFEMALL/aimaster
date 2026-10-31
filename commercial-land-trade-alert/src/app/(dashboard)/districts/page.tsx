import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SIDO_GROUPS, groupByCity } from "@/lib/publicdata/districts";
import { DistrictSearch } from "@/components/districts/DistrictSearch";
import { DistrictToggle } from "@/components/districts/DistrictToggle";
import { PageHero } from "@/components/ui/PageHero";

export default async function DistrictsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: watches } = await supabase.from("commercial_land_watch").select("sgg_cd").eq("user_id", user.id).eq("is_active", true);
  const active = new Set(((watches ?? []) as { sgg_cd: string }[]).map((w) => w.sgg_cd));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="📍 STEP 4 · 관심 지역"
        title="관심 지역 고르기"
        description="전국 시·군·구 중 관심 있는 곳을 눌러 주세요. 직접 수집할 일은 없습니다. 서버가 국토부 공개 자료를 지역마다 하루 1회 자동으로 받아 옵니다."
        tip={`지금 ${active.size}곳 선택됨 · 새로 고른 지역은 보통 5~10분 안에 첫 자료가 들어옵니다.`}
      />
      <div className="mb-6" />
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
  );
}
