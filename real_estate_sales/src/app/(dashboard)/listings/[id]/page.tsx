import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AnalyzeButton } from "@/components/listings/AnalyzeButton";

function formatWon(amount: number | null): string {
  if (!amount) return "-";
  return `${(amount / 10000).toLocaleString("ko-KR")}억`.replace(".0억", "억");
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("real_estate_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!listing) notFound();

  const { data: analyses } = await supabase
    .from("real_estate_analyses")
    .select("*")
    .eq("user_id", user.id)
    .eq("listing_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-neutral-400">
        {listing.sgg_nm} {listing.stdg_nm}
      </p>
      <h1 className="gold-text mb-4 text-2xl font-semibold">{listing.bldg_nm}</h1>

      <div className="glass-card mb-6 grid grid-cols-2 gap-y-2 p-5 text-sm">
        <span className="text-neutral-400">계약일</span>
        <span className="text-neutral-100">{listing.contract_date ?? "-"}</span>
        <span className="text-neutral-400">전용면적</span>
        <span className="text-neutral-100">{listing.exclusive_area ?? "-"}m²</span>
        <span className="text-neutral-400">건물면적</span>
        <span className="text-neutral-100">{listing.building_area ?? "-"}m²</span>
        <span className="text-neutral-400">층</span>
        <span className="text-neutral-100">{listing.floor ?? "-"}층</span>
        <span className="text-neutral-400">건축년도</span>
        <span className="text-neutral-100">{listing.building_year ?? "-"}</span>
        <span className="text-neutral-400">거래금액</span>
        <span className="text-gold-light font-medium">{formatWon(listing.price_amount)}</span>
        <span className="text-neutral-400">공시가격</span>
        <span className="text-neutral-100">
          {formatWon(listing.official_price ? listing.official_price / 10000 : null)}
        </span>
      </div>

      <AnalyzeButton listingId={listing.id} />

      {analyses && analyses.length > 0 && (
        <div className="mt-6 space-y-3">
          <h2 className="text-lg font-medium text-neutral-100">분석 이력</h2>
          {analyses.map((a) => (
            <div key={a.id} className="glass-card p-4 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-gold-light font-medium">
                  투자 매력도 {a.investment_score ?? "-"}점
                </span>
                <span className="text-xs text-neutral-500">{a.model}</span>
              </div>
              <p className="mb-1 text-neutral-300">
                저평가지수 {a.undervaluation_index ?? "-"} · 1년 상승예측률{" "}
                {a.predicted_growth_pct ?? "-"}%
              </p>
              {a.rationale && <p className="text-neutral-400">{a.rationale}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
