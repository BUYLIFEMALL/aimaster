import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ensureListingAnalysis } from "@/lib/actions/analysis";
import { ReanalyzeButton } from "@/components/listings/ReanalyzeButton";
import Link from "next/link";

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

  // 아직 분석된 적 없는 매물이면, 설정에서 등록해둔 모델+API 키로 자동 분석해서 저장한다
  // (이미 분석되어 있으면 다시 호출하지 않아 비용이 반복되지 않는다).
  await ensureListingAnalysis(supabase, user.id, id);

  const [{ data: analyses }, { data: apiKeys }] = await Promise.all([
    supabase
      .from("real_estate_analyses")
      .select("*")
      .eq("user_id", user.id)
      .eq("listing_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("user_api_keys").select("provider").eq("user_id", user.id),
  ]);

  const hasKeys =
    (apiKeys ?? []).some((k) => k.provider === "openai") &&
    (apiKeys ?? []).some((k) => k.provider === "perplexity");

  const latest = analyses?.[0];

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

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-medium text-neutral-100">AI 투자 분석</h2>
        {latest && <ReanalyzeButton listingId={listing.id} />}
      </div>

      {!hasKeys ? (
        <div className="glass-card p-4 text-sm text-neutral-400">
          AI 분석을 보려면 먼저{" "}
          <Link href="/settings" className="text-gold-light underline">
            설정
          </Link>
          에서 OpenAI·Perplexity API 키와 선호 모델을 등록해주세요.
        </div>
      ) : !latest ? (
        <div className="glass-card p-4 text-sm text-neutral-400">
          분석에 실패했어요. 설정에서 등록한 API 키가 유효한지 확인 후, 아래 버튼으로
          다시 시도해주세요.
          <div className="mt-3">
            <ReanalyzeButton listingId={listing.id} />
          </div>
        </div>
      ) : (
        <div className="glass-card p-4 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-gold-light text-base font-medium">
              투자 매력도 {latest.investment_score ?? "-"}점
            </span>
            <span className="text-xs text-neutral-500">{latest.model}</span>
          </div>
          <p className="mb-1 text-neutral-300">
            저평가지수 {latest.undervaluation_index ?? "-"} · 1년 상승예측률{" "}
            {latest.predicted_growth_pct ?? "-"}%
          </p>
          {latest.rationale && (
            <p className="whitespace-pre-line text-neutral-400">{latest.rationale}</p>
          )}
        </div>
      )}

      {analyses && analyses.length > 1 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-medium text-neutral-400">이전 분석 이력</h3>
          {analyses.slice(1).map((a) => (
            <div key={a.id} className="glass-card p-4 text-sm opacity-70">
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
              {a.rationale && (
                <p className="whitespace-pre-line text-neutral-400">{a.rationale}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
