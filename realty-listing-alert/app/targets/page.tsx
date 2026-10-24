import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import TargetsClient, { type TargetRow } from "./TargetsClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 🎯 감시 대상(인수인계 §3-1·§3-5): 단지 추가·조건·대상별 켜기/끄기·삭제, 최대 10개.
export default async function TargetsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data } = await supabase
    .from("realty_alert_targets")
    .select("id, complex_no, complex_name, trade_types, price_min, price_max, area_min, area_max, enabled, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="studio-shell">
      <StudioSidebar email={user.email ?? ""} active="targets" />
      <main className="main">
        <div className="topline">
          <div>
            <div className="eyebrow">Step 1 · 감시 대상</div>
            <h1>🎯 감시할 단지를 정해 주세요</h1>
            <p className="lede">네이버 부동산 단지 화면 주소를 붙여 넣으면 단지 번호를 알아서 꺼냅니다. 최대 10개까지 등록하고, 대상마다 켜고 끌 수 있어요.</p>
          </div>
        </div>
        <TargetsClient initialTargets={(data ?? []) as TargetRow[]} />
      </main>
    </div>
  );
}
