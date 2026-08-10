import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// price_amount는 만원 단위로 저장되고, official_price(VWorld 응답)는 원 단위로 저장된다.
// 이 함수는 "만원" 단위 입력을 받는다고 가정한다.
function formatWon(amountManwon: number | null): string {
  if (!amountManwon) return "-";
  return `${(amountManwon / 10000).toLocaleString("ko-KR")}억`.replace(".0억", "억");
}

export default async function ListingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("real_estate_user_matches")
    .select("id, status, created_at, listing:real_estate_listings(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (matches ?? []).filter((m) => m.listing);

  return (
    <div>
      <h1 className="gold-text mb-2 text-2xl font-semibold">매물 목록</h1>
      <p className="mb-6 text-sm text-neutral-400">
        관심 지역에서 새로 발견된 매물이에요. 매일 자동으로 새 매물이 추가됩니다.
      </p>

      {rows.length === 0 && (
        <p className="text-sm text-neutral-500">
          아직 매칭된 매물이 없어요. 먼저 &quot;관심 지역 설정&quot;에서 지역을 선택해주세요.
        </p>
      )}

      <div className="space-y-3">
        {rows.map((m) => {
          const listing = Array.isArray(m.listing) ? m.listing[0] : m.listing;
          if (!listing) return null;
          return (
            <Link key={m.id} href={`/listings/${listing.id}`} className="block">
              <div className="glass-card p-4 transition-colors hover:border-gold/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">
                    {listing.sgg_nm} {listing.stdg_nm}
                  </span>
                  <span className="text-xs text-neutral-500">{listing.contract_date}</span>
                </div>
                <h3 className="mt-1 text-lg font-medium text-neutral-100">{listing.bldg_nm}</h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-300">
                  <span>전용 {listing.exclusive_area ?? "-"}m²</span>
                  <span>{listing.floor ?? "-"}층</span>
                  <span className="text-gold-light font-medium">
                    거래 {formatWon(listing.price_amount)}
                  </span>
                  {listing.official_price !== null && (
                    <span>공시 {formatWon(listing.official_price / 10000)}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
