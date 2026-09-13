import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";

function formatWon(amountManwon: number | null): string {
  if (!amountManwon) return "-";
  return `${(amountManwon / 10000).toLocaleString("ko-KR")}억`.replace(".0억", "억");
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ count: districtCount }, { count: newCount }, { data: recentMatches }, { data: program }] =
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
      // 대시보드 상단 설명 박스 — AIMaster 루트의 프로그램 소개(메인 페이지 programs.description/
      // short_desc)를 그대로 가져와 보여준다(2026-09-13 요청, naver-cafe-poster 패턴을 전
      // 서브프로젝트로 확대 적용). AIMaster Database 타입에는 없는 테이블이라(access.ts와
      // 동일한 이유) 제네릭 타입 충돌을 피하기 위해 from()을 느슨한 타입으로 캐스팅한다.
      (supabase as unknown as { from: (table: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from("programs")
        .select("description, short_desc")
        .eq("slug", "real-estate-sales")
        .maybeSingle() as Promise<{ data: { description: string | null; short_desc: string | null } | null }>,
    ]);

  const recentListings = (recentMatches ?? [])
    .map((m) => (Array.isArray(m.listing) ? m.listing[0] : m.listing))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  return (
    <div>
      <h1 className="gold-text mb-6 text-2xl font-semibold">대시보드</h1>

      {(program?.description || program?.short_desc) && (
        <div className="glass-card mb-6 p-5">
          {splitIntoSentenceParagraphs(program.description || program.short_desc || "").map((sentence, i) => (
            <p key={i} className="mb-2 text-sm leading-relaxed text-neutral-300 last:mb-0">
              {sentence}
            </p>
          ))}
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-2">
        <Link href="/districts" className="glass-card p-5 hover:border-gold/40">
          <p className="text-sm text-neutral-400">관심 등록한 지역</p>
          <p className="gold-text mt-1 text-3xl font-semibold">{districtCount ?? 0}개</p>
        </Link>
        <Link href="/listings" className="glass-card p-5 hover:border-gold/40">
          <p className="text-sm text-neutral-400">아직 안 본 새 실거래</p>
          <p className="gold-text mt-1 text-3xl font-semibold">{newCount ?? 0}건</p>
        </Link>
      </div>

      <h2 className="mb-3 text-lg font-medium text-neutral-100">최근 발견된 실거래</h2>
      {recentListings.length === 0 ? (
        <p className="text-sm text-neutral-500">
          아직 매칭된 실거래가 없어요. 먼저 &quot;관심 지역 설정&quot;에서 지역을 선택해주세요.
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
            전체 실거래 내역 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}
