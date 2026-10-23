import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/PageHero";
import { KpiCard, KpiGrid } from "@/components/ui/KpiCard";
import { ListingMatrix, type ListingRow } from "@/components/listings/ListingMatrix";
import { formatWon } from "@/lib/format";

export default async function ListingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("real_estate_user_matches")
    .select("id, status, created_at, listing:real_estate_listings(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows: ListingRow[] = (matches ?? []).flatMap((m) => {
    const l = Array.isArray(m.listing) ? m.listing[0] : m.listing;
    if (!l) return [];
    return [
      {
        matchId: m.id,
        status: m.status,
        id: l.id,
        name: l.bldg_nm ?? "(이름 없음)",
        sgg: l.sgg_nm ?? "",
        dong: l.stdg_nm ?? "",
        contractDate: l.contract_date,
        area: l.exclusive_area,
        floor: l.floor,
        price: l.price_amount,
        official: l.official_price,
      },
    ];
  });
  const prices = rows.map((r) => r.price ?? 0).filter((p) => p > 0);
  const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHero
        badge="🏢 STEP 2 · 실거래 내역"
        title="실거래 내역"
        description="관심 지역에서 새로 신고된 실거래예요. 행을 누르면 공시가 대비 비율·토지 정보·AI 투자 분석을 볼 수 있어요. 최근 50건까지 표시됩니다."
        tip="상세 화면을 처음 열면 회원님 본인 AI 키로 분석이 1회 실행되고, 이후에는 저장된 결과를 보여 드려요."
      />

      <KpiGrid>
        <KpiCard icon="🏢" label="표시된 실거래" value={rows.length} />
        <KpiCard icon="📊" label="평균 거래가" value={formatWon(avg)} tone="green" />
        <KpiCard icon="🏆" label="최고 거래가" value={formatWon(prices.length ? Math.max(...prices) : null)} tone="amber" />
        <KpiCard icon="🤖" label="AI 분석 완료" value={rows.filter((r) => r.status === "analyzed").length} tone="muted" />
      </KpiGrid>

      {rows.length === 0 ? (
        <div className="mx-card py-16 text-center">
          <p className="text-5xl">🏙️</p>
          <p className="mt-4 text-sm text-mx-muted">아직 매칭된 실거래가 없어요. 먼저 관심 지역을 골라 주세요.</p>
          <Link href="/districts" className="mx-btn-primary mt-4">
            📍 관심 지역 설정하기
          </Link>
        </div>
      ) : (
        <ListingMatrix rows={rows} />
      )}
    </div>
  );
}
