import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SEOUL_DISTRICTS } from "@/lib/publicdata/districts";
import { DistrictToggle } from "@/components/districts/DistrictToggle";

export default async function DistrictsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: watches } = await supabase
    .from("real_estate_watch_districts")
    .select("sgg_cd, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const activeCodes = new Set((watches ?? []).map((w) => w.sgg_cd));

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
            isActive={activeCodes.has(d.sgg_cd)}
          />
        ))}
      </div>
    </div>
  );
}
