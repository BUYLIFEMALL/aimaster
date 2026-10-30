import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/PageHero";
import { KpiCard, KpiGrid } from "@/components/ui/KpiCard";
import { ListingMatrix, type ListingRow } from "@/components/listings/ListingMatrix";
import { formatWon } from "@/lib/format";
import { districtNameOf, findDistrict } from "@/lib/publicdata/districts";

// RE-B1(2026-10-26): 50건에서 끊기던 목록을 쪽 나누기로 — 주소 ?page=2 처럼
const PAGE_SIZE = 50;

// 2026-10-30: 주소 ?district=시군구5자리 · ?q=단지명 으로 거르기 — 「부동산 실시간 매물 알림」 감시 단지의 「📈 실거래 보기」가 이 주소로 연다
function cleanQuery(v: string | undefined) {
  return String(v ?? "").replace(/[%_*,()\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
}

export default async function ListingsPage({ searchParams }: { searchParams: Promise<{ page?: string; district?: string; q?: string }> }) {
  const user = await requireUser();
  const supabase = await createClient();
  const sp = await searchParams;
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const district = sp.district && findDistrict(sp.district) ? sp.district : "";
  const askedQ = cleanQuery(sp.q);
  const filtered = !!(district || askedQ);

  const runQuery = (name: string) => {
    let query = supabase
      .from("real_estate_user_matches")
      .select(`id, status, created_at, listing:real_estate_listings${filtered ? "!inner" : ""}(*)`, { count: "exact" })
      .eq("user_id", user.id);
    if (district) query = query.eq("listing.sgg_cd", district);
    if (name) query = query.ilike("listing.bldg_nm", `%${name}%`);
    return query.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
  };
  let q = askedQ;
  let { data: matches, count } = await runQuery(q);
  // 네이버 단지 이름과 국토부 신고 이름이 달라(「백송건영」 ↔ 「백송마을(건영)」) 0건이면 앞 두 글자로 한 번 더 찾는다
  let loosened = false;
  if (askedQ.length >= 3 && !count) {
    const short = askedQ.replace(/\s/g, "").slice(0, 2);
    const retry = await runQuery(short);
    if (retry.count) {
      ({ data: matches, count } = retry);
      q = short;
      loosened = true;
    }
  }
  const total = count ?? 0;
  const pageHref = (p: number) => `/listings?${new URLSearchParams({ ...(district ? { district } : {}), ...(q ? { q } : {}), page: String(p) }).toString()}`;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
        description="관심 지역에서 새로 신고된 실거래예요. 행을 누르면 공시가 대비 비율·토지 정보·AI 투자 분석을 볼 수 있어요. 한 쪽에 50건씩, 아래에서 쪽을 넘겨요."
        tip="AI 투자 분석은 상세 화면에서 「AI 분석 실행」을 눌렀을 때만 회원님 본인 키로 실행돼요. 열어 본 실거래는 「✔ 확인됨」으로 바뀌어요."
      />

      <KpiGrid>
        <KpiCard icon="🏢" label="전체 실거래" value={total} />
        <KpiCard icon="📊" label="평균 거래가" value={formatWon(avg)} tone="green" />
        <KpiCard icon="🏆" label="최고 거래가" value={formatWon(prices.length ? Math.max(...prices) : null)} tone="amber" />
        <KpiCard icon="🤖" label="AI 분석 완료" value={rows.filter((r) => r.status === "analyzed").length} tone="muted" />
      </KpiGrid>

      {filtered && (
        <div className="mx-card flex flex-wrap items-center gap-3 text-sm">
          <span>
            🔎 거르는 중: {district ? <b>{districtNameOf(district)}</b> : null}
            {district && q ? " · " : null}
            {q ? <>단지명에 「<b>{q}</b>」</> : null}
            {loosened ? <> — 「{askedQ}」 그대로는 없어 비슷한 이름으로 찾았어요</> : null}
          </span>
          <Link href="/listings" className="mx-btn-ghost">전체 보기</Link>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="mx-card py-16 text-center">
          <p className="text-5xl">🏙️</p>
          <p className="mt-4 text-sm text-mx-muted">
            {filtered
              ? "조건에 맞는 실거래가 아직 없어요. 네이버 단지 이름과 국토부 신고 이름이 다를 수 있어요(예: 「백송건영」 ↔ 「백송마을(건영)」). 「전체 보기」로 찾아보거나, 그 지역을 관심 지역에 추가해 주세요."
              : "아직 매칭된 실거래가 없어요. 먼저 관심 지역을 골라 주세요."}
          </p>
          <Link href="/districts" className="mx-btn-primary mt-4">
            📍 관심 지역 설정하기
          </Link>
        </div>
      ) : (
        <>
          <ListingMatrix rows={rows} />
          {pages > 1 && (
            <nav className="flex items-center justify-center gap-3 text-sm" aria-label="쪽 이동">
              {page > 1 ? <Link href={pageHref(page - 1)} className="mx-btn-ghost">← 이전 50건</Link> : <span className="opacity-40">← 이전 50건</span>}
              <span className="text-mx-muted">{page} / {pages}쪽 · 전체 {total}건</span>
              {page < pages ? <Link href={pageHref(page + 1)} className="mx-btn-ghost">다음 50건 →</Link> : <span className="opacity-40">다음 50건 →</span>}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
