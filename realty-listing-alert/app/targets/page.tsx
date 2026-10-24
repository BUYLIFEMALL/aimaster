import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import TargetsClient, { type TargetRow } from "./TargetsClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 실거래 프로그램(real-estate-sales) 「이 단지 매물 알림 받기」 버튼이 ?name=단지명&region=지역 으로 보낸다.
// 실거래 자료에는 네이버 단지 번호가 없으므로(우리 서버는 네이버에 요청하지 않음) 이름만 미리 채우고 주소는 회원이 붙여 넣는다.
function cleanParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v ?? "").trim().slice(0, 100);
}

// 🎯 감시 대상(인수인계 §3-1·§3-5): 단지 추가·조건·대상별 켜기/끄기·삭제, 최대 10개.
export default async function TargetsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const prefillName = cleanParam(sp.name);
  const prefill = prefillName ? { name: prefillName, region: cleanParam(sp.region) } : null;
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data } = await supabase
    .from("realty_alert_targets")
    .select("id, complex_no, complex_name, target_type, cortar_no, region_name, region_max_complexes, trade_types, price_min, price_max, area_min, area_max, enabled, created_at")
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
            <p className="lede">네이버 부동산에서 단지를 열고 초록 버튼 한 번만 누르면 추가돼요. 최대 10곳까지 등록하고, 단지마다 켜고 끌 수 있어요.</p>
          </div>
        </div>
        <TargetsClient initialTargets={(data ?? []) as TargetRow[]} prefill={prefill} />
      </main>
    </div>
  );
}
