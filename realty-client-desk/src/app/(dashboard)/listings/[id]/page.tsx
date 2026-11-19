import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { deleteSendAction } from "@/lib/actions/listings";
import { feeKindOf } from "@/lib/desk/fee";
import { adEligibility, adFooter, adHeader, draftBody, isNightKst, matchReasons, type Office } from "@/lib/desk/adRules";
import { missingAdItems } from "@/lib/desk/adCheck";
import { day, priceText } from "@/lib/desk/format";
import { SendAdForm, type Candidate } from "@/components/desk/SendAdForm";
import { PageHero } from "@/components/ui/PageHero";
import { resolveAddressRegion, toTradeHint, type TradeHint, type TradeRow } from "@/lib/desk/tradeHint";
import { DISTRICTS } from "@/lib/desk/districts";
import { OPTOUT_PLACEHOLDER } from "@/lib/desk/smsBytes";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const SEND_STATUS: Record<string, string> = { sending: "보내는 중", sent: "보냄", failed: "실패" };

export default async function ListingMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireProgramAccess();
  const { id } = await params;
  const db = (await createClient()) as unknown as SupabaseLike;
  const { data: listing } = await db.from("realty_desk_listings").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!listing) notFound();
  const [{ data: clients }, { data: sends }, { data: office }, { data: account }, { data: aiKeys }] = await Promise.all([
    db.from("realty_desk_clients").select("*").eq("user_id", user.id).limit(2000),
    db.from("realty_desk_sends").select("id, client_id, to_phone, status, error, created_at").eq("user_id", user.id).eq("listing_id", id).order("created_at", { ascending: false }),
    db.from("realty_desk_offices").select("office_name, office_phone, office_address, reject_080, reg_no, broker_name").eq("user_id", user.id).maybeSingle(),
    db.from("user_solapi_accounts").select("user_id").eq("user_id", user.id).maybeSingle(),
    db.from("user_api_keys").select("provider").eq("user_id", user.id).in("provider", ["openai", "anthropic", "gemini"]),
  ]);
  const sentIds = new Set((sends ?? []).map((s: { client_id: string | null }) => s.client_id));
  const nameOf = new Map<string, string>((clients ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
  const candidates: Candidate[] = [];
  for (const c of clients ?? []) {
    const why = matchReasons(c, listing);
    if (!why) continue;
    const e = adEligibility(c);
    candidates.push({ id: c.id, name: c.name, phone: c.phone, why, ok: e.ok, note: e.ok ? "" : e.reason, soon: e.ok && e.soon, sent: sentIds.has(c.id) });
  }
  candidates.sort((a, b) => Number(b.ok && !b.sent) - Number(a.ok && !a.sent));
  const o: Office = office ?? { office_name: "사무소 이름", office_phone: "전화번호", office_address: null, reject_080: null };
  const ready = !office ? "사무소 이름·전화번호를 먼저 저장해 주세요(문자 맨 앞에 들어가요)." : !account ? "본인 SOLAPI 계정을 먼저 등록해 주세요." : null;
  // L-1(2026-11-19): 이 동 최근 실거래 — 실거래 프로그램이 모은 공공 실거래(real_estate_listings)를 회원 세션으로 읽기만.
  // 조회 전에 주소를 하나의 시군구 코드로 정한다(못 정하면 조회·표시 안 함). 조회는 그 코드로만, 오류면 줄 전체를 숨기고 나머지 화면은 그대로.
  const region = resolveAddressRegion(listing.address, DISTRICTS);
  let tradeHint: TradeHint = { status: "error" };
  if (region) {
    try {
      const res = await db.from("real_estate_listings")
        .select("sgg_cd, stdg_nm, bldg_nm, deal_type, exclusive_area, price_amount, monthly_rent, contract_date")
        .eq("sgg_cd", region.sggCd).eq("stdg_nm", region.dong).eq("deal_type", listing.deal_type)
        .not("contract_date", "is", null) // 계약일 칸은 비어 있을 수 있음(스키마 contract_date date) — 빈 행이 3건 자리를 차지하지 않게
        .order("contract_date", { ascending: false, nullsFirst: false }).limit(3);
      tradeHint = toTradeHint({ data: (res.data ?? null) as TradeRow[] | null, error: res.error ?? null }, region, listing.deal_type);
    } catch {
      tradeHint = { status: "error" };
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link href="/listings" className="text-sm text-mx-link">← 내 매물</Link>
      <PageHero badge="👥 맞는 고객" title={listing.title} description={`${listing.property_type} · ${priceText(listing)}${listing.area_m2 ? ` · 전용 ${listing.area_m2}㎡` : ""} · ${listing.address}`} />
      <Link href={`/fee?kind=${encodeURIComponent(feeKindOf(listing.property_type))}${listing.property_type === "분양권" ? "&presale=1" : ""}&deal=${encodeURIComponent(listing.deal_type)}&price=${listing.price}${listing.monthly ? `&monthly=${listing.monthly}` : ""}`} className="mx-btn-ghost inline-flex min-h-[40px] w-fit items-center px-3 text-xs">💰 이 매물 중개보수 계산</Link>
      {region && tradeHint.status === "ok" && (
        <section className="mx-card p-4 text-sm">
          <h2 className="text-sm font-bold text-mx-text">📈 {region.sggNm} {region.dong} 최근 {listing.deal_type} 실거래</h2>
          <ul className="mt-1 space-y-0.5 text-mx-text">{tradeHint.lines.map((l) => <li key={l}>• {l}</li>)}</ul>
          <p className="mt-1 text-xs text-mx-muted">국토교통부·서울시 공개 실거래(날짜는 계약일, 실거래 투자분석 프로그램이 모은 지역만). 고객에게 설명할 참고 자료예요.</p>
        </section>
      )}
      {region && tradeHint.status === "none" && (
        <p className="text-xs text-mx-muted">📈 {region.sggNm} {region.dong} 실거래 자료가 아직 없어요 — 「부동산 실거래 투자분석」에서 이 지역을 켜면 여기에 최근 거래가 보여요.</p>
      )}
      {listing.status !== "광고 중" ? (
        <p className="mx-card p-5 text-sm text-mx-muted">「광고 중」인 매물만 안내할 수 있어요. 목록에서 상태를 바꿔 주세요.</p>
      ) : (
        <SendAdForm
          listingId={listing.id}
          draft={draftBody(listing)}
          header={adHeader(o)}
          footer={adFooter(o, `https://realty-client-desk.buylife.xyz/u/${OPTOUT_PLACEHOLDER}`)}
          candidates={candidates}
          night={isNightKst()}
          ready={ready}
          missing={missingAdItems(listing, office ?? null)}
          aiKeys={{ openai: (aiKeys ?? []).some((k: { provider: string }) => k.provider === "openai"), claude: (aiKeys ?? []).some((k: { provider: string }) => k.provider === "anthropic"), gemini: (aiKeys ?? []).some((k: { provider: string }) => k.provider === "gemini") }}
        />
      )}
      {(sends ?? []).length > 0 && (
        <div className="mx-card p-5 text-sm">
          <h2 className="mb-2 text-base font-bold text-mx-text">📜 이 매물 발송 기록</h2>
          <ul className="divide-y divide-mx-border">
            {(sends ?? []).map((s: { id: string; client_id: string | null; to_phone: string; status: string; error: string | null; created_at: string }) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{day(s.created_at)} · {(s.client_id && nameOf.get(s.client_id)) || "삭제된 고객"} {s.to_phone} · <b>{SEND_STATUS[s.status] ?? s.status}</b>{s.error ? ` (${s.error})` : ""}</span>
                {s.status === "failed" && (
                  <form action={deleteSendAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="listingId" value={listing.id} />
                    <button type="submit" className="mx-btn-ghost min-h-[40px] px-3 text-xs">기록 지우고 다시 보낼 수 있게</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
