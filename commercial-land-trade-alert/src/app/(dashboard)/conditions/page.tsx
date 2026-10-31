import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/PageHero";
import { ConditionsForm } from "@/components/conditions/ConditionsForm";
import { normalizePrefs } from "@/lib/trades/prefs";

export default async function ConditionsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("commercial_land_preferences").select("*").eq("user_id", user.id).maybeSingle();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHero
        badge="🧾 STEP 5 · 거래 조건"
        title="받을 거래 조건"
        description="여기서 고른 조건이 목록의 「내 조건만」과 실거래 알림에 함께 적용됩니다."
        tip="숙박·도로·지분 거래는 건수가 많아 기본으로 꺼 두었습니다. 필요하면 켜 주세요."
      />
      <div className="mb-6" />
      <ConditionsForm prefs={normalizePrefs(data)} />
    </div>
  );
}
