import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReanalyzeButton } from "@/components/listings/ReanalyzeButton";
import Link from "next/link";
import { KpiCard } from "@/components/ui/KpiCard";
import { formatWon, priceToOfficialPct } from "@/lib/format";

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

  // 2026-10-17 v1.13: 상세 화면을 여는 것만으로는 유료 AI 분석을 실행하지 않는다(회원 본인 키 비용 — IMPROVEMENT_HANDOFF #12).
  // 분석은 아래 [AI 분석 실행] 버튼을 눌렀을 때만 한다.

  const [{ data: analyses }, { data: apiKeys }, { data: landInfo }] = await Promise.all([
    supabase
      .from("real_estate_analyses")
      .select("*")
      .eq("user_id", user.id)
      .eq("listing_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("user_api_keys").select("provider").eq("user_id", user.id),
    listing.pnu
      ? supabase
          .from("real_estate_land_info")
          .select("price_per_m2, price_stdr_year, use_zones")
          .eq("pnu", listing.pnu)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const hasKeys =
    (apiKeys ?? []).some((k) => k.provider === "openai") &&
    (apiKeys ?? []).some((k) => k.provider === "perplexity");

  const latest = analyses?.[0];
  const ratio = priceToOfficialPct(listing.price_amount, listing.official_price);
  const perM2 =
    listing.price_amount && listing.exclusive_area ? Math.round(listing.price_amount / listing.exclusive_area) : null;
  const score = latest?.investment_score ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/listings" className="inline-flex min-h-[40px] items-center gap-1 text-sm text-mx-muted hover:text-mx-text">
        ← 실거래 내역으로
      </Link>

      <div className="rounded-2xl border border-mx-border bg-gradient-to-br from-[#172554] via-mx-surface to-mx-surface p-5">
        <span className="mx-chip-blue mb-2">
          📍 {listing.sgg_nm} {listing.stdg_nm}
        </span>
        <h1 className="text-2xl font-black text-mx-text">{listing.bldg_nm}</h1>
        <p className="mt-1 text-sm text-mx-muted">
          계약일 {listing.contract_date ?? "-"} · 전용 {listing.exclusive_area ?? "-"}㎡ · {listing.floor ?? "-"}층 · 건축 {listing.building_year ?? "-"}년
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon="💰" label="거래가" value={formatWon(listing.price_amount)} />
        <KpiCard
          icon="🏛️"
          label="공시가격"
          value={formatWon(listing.official_price ? listing.official_price / 10000 : null)}
          tone="muted"
        />
        <KpiCard icon="📐" label="공시가 대비" value={ratio !== null ? `${ratio}%` : "-"} hint="거래가 ÷ 공시가격" tone="amber" />
        <KpiCard
          icon="📏"
          label="㎡당 거래가"
          value={perM2 ? `${perM2.toLocaleString("ko-KR")}만원` : "-"}
          hint={listing.building_area ? `건물면적 ${listing.building_area}㎡` : undefined}
          tone="green"
        />
      </div>

      {landInfo && (landInfo.price_per_m2 || landInfo.use_zones) && (
        <div className="mx-card">
          <h2 className="mx-section-title">🗺️ 토지(대지) 정보</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-mx-raised p-3">
              <dt className="text-xs text-mx-muted">
                개별공시지가{landInfo.price_stdr_year ? ` (${landInfo.price_stdr_year}년)` : ""}
              </dt>
              <dd className="mt-1 font-bold text-mx-text">
                {landInfo.price_per_m2 ? `${landInfo.price_per_m2.toLocaleString("ko-KR")}원/㎡` : "-"}
              </dd>
            </div>
            <div className="rounded-xl bg-mx-raised p-3">
              <dt className="text-xs text-mx-muted">용도지역/지구/구역</dt>
              <dd className="mt-1 font-bold text-mx-text">{landInfo.use_zones ?? "-"}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="mx-card border-l-4 border-l-mx-accent">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="mx-section-title mb-0">🤖 AI 투자 분석</h2>
          {latest && <ReanalyzeButton listingId={listing.id} />}
        </div>

        {!hasKeys ? (
          <p className="text-sm text-mx-muted">
            AI 분석을 보려면 먼저{" "}
            <Link href="/settings" className="font-semibold text-mx-link underline">
              API키등록·플랫폼연동
            </Link>
            에서 OpenAI·Perplexity 본인 키와 선호 모델을 등록해 주세요.
          </p>
        ) : !latest ? (
          <div className="space-y-1 text-sm text-mx-muted">
            <p>아직 이 실거래를 AI로 분석하지 않았어요.</p>
            <p>버튼을 누르면 등록한 본인 OpenAI·Perplexity 키로 분석하며, 그 요금은 각 제공사에 청구됩니다.</p>
            <div className="mt-3">
              <ReanalyzeButton listingId={listing.id} first />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-bold text-mx-text">투자 매력도</span>
                <span className="text-2xl font-black tabular-nums text-mx-link">{score ?? "-"}점</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-mx-raised" aria-hidden="true">
                <div className="h-full rounded-full bg-mx-primary" style={{ width: `${Math.max(0, Math.min(100, score ?? 0))}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="mx-chip-amber">저평가지수 {latest.undervaluation_index ?? "-"}</span>
              <span className="mx-chip-green">1년 상승예측 {latest.predicted_growth_pct ?? "-"}%</span>
              <span className="mx-chip">모델 {latest.model}</span>
            </div>
            {latest.rationale && <p className="whitespace-pre-line text-sm leading-relaxed text-mx-text">{latest.rationale}</p>}
            <p className="text-xs text-mx-muted">※ AI 추정치입니다. 투자 판단과 책임은 본인에게 있으며, 수익을 보장하지 않습니다.</p>
          </div>
        )}
      </div>

      {analyses && analyses.length > 1 && (
        <div className="mx-card">
          <h2 className="mx-section-title">🗂️ 이전 분석 이력</h2>
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="mx-table min-w-[560px]">
              <thead>
                <tr>
                  <th className="text-right">매력도</th>
                  <th className="text-right">저평가지수</th>
                  <th className="text-right">1년 상승예측</th>
                  <th>모델</th>
                  <th>근거</th>
                </tr>
              </thead>
              <tbody>
                {analyses.slice(1).map((a) => (
                  <tr key={a.id}>
                    <td className="text-right font-bold tabular-nums">{a.investment_score ?? "-"}점</td>
                    <td className="text-right tabular-nums">{a.undervaluation_index ?? "-"}</td>
                    <td className="text-right tabular-nums">{a.predicted_growth_pct ?? "-"}%</td>
                    <td className="text-mx-muted">{a.model}</td>
                    <td className="max-w-[320px]">
                      <p className="line-clamp-2 text-xs text-mx-muted">{a.rationale ?? "-"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
