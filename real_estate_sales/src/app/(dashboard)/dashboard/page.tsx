import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function formatWon(amountManwon: number | null): string {
  if (!amountManwon) return "-";
  return `${(amountManwon / 10000).toLocaleString("ko-KR")}억`.replace(".0억", "억");
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ count: districtCount }, { count: newCount }, { data: recentMatches }] =
    await Promise.all([
      supabase
        .from("real_estate_watch_districts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true),
      supabase
        .from("real_estate_user_matches")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "new"),
      supabase
        .from("real_estate_user_matches")
        .select("id, listing:real_estate_listings(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const recentListings = (recentMatches ?? [])
    .map((m) => (Array.isArray(m.listing) ? m.listing[0] : m.listing))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  return (
    <div>
      <h1 className="gold-text mb-6 text-2xl font-semibold">대시보드</h1>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-2">
        <Link href="/districts" className="glass-card p-5 hover:border-gold/40">
          <p className="text-sm text-neutral-400">관심 등록한 지역</p>
          <p className="gold-text mt-1 text-3xl font-semibold">{districtCount ?? 0}개</p>
        </Link>
        <Link href="/listings" className="glass-card p-5 hover:border-gold/40">
          <p className="text-sm text-neutral-400">아직 안 본 새 매물</p>
          <p className="gold-text mt-1 text-3xl font-semibold">{newCount ?? 0}건</p>
        </Link>
      </div>

      <h2 className="mb-3 text-lg font-medium text-neutral-100">최근 발견된 매물</h2>
      {recentListings.length === 0 ? (
        <p className="text-sm text-neutral-500">
          아직 매칭된 매물이 없어요. 먼저 &quot;관심 지역 설정&quot;에서 지역을 선택해주세요.
        </p>
      ) : (
        <div className="space-y-3">
          {recentListings.map((listing) => (
            <Link key={listing.id} href={`/listings/${listing.id}`} className="block">
              <div className="glass-card p-4 hover:border-gold/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">
                    {listing.sgg_nm} {listing.stdg_nm}
                  </span>
                  <span className="text-xs text-neutral-500">{listing.contract_date}</span>
                </div>
                <h3 className="mt-1 text-base font-medium text-neutral-100">{listing.bldg_nm}</h3>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-300">
                  <span>전용 {listing.exclusive_area ?? "-"}m²</span>
                  <span className="text-gold-light font-medium">
                    거래 {formatWon(listing.price_amount)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          <Link
            href="/listings"
            className="block text-center text-sm text-neutral-400 hover:text-gold-light"
          >
            전체 매물 목록 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}
