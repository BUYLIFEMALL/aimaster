import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { deleteSendAction } from "@/lib/actions/listings";
import { adEligibility, adFooter, adHeader, draftBody, isNightKst, matchReasons, type Office } from "@/lib/desk/adRules";
import { missingAdItems } from "@/lib/desk/adCheck";
import { day, priceText } from "@/lib/desk/format";
import { SendAdForm, type Candidate } from "@/components/desk/SendAdForm";
import { PageHero } from "@/components/ui/PageHero";

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

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link href="/listings" className="text-sm text-mx-link">← 내 매물</Link>
      <PageHero badge="👥 맞는 고객" title={listing.title} description={`${listing.property_type} · ${priceText(listing)}${listing.area_m2 ? ` · 전용 ${listing.area_m2}㎡` : ""} · ${listing.address}`} />
      <Link href={`/fee?kind=${encodeURIComponent(listing.property_type === "오피스텔" ? "오피스텔" : listing.property_type === "아파트" || listing.property_type === "빌라·주택" ? "주택" : "그 외(상가·토지 등)")}&deal=${encodeURIComponent(listing.deal_type)}&price=${listing.price}${listing.monthly ? `&monthly=${listing.monthly}` : ""}`} className="mx-btn-ghost inline-flex min-h-[40px] w-fit items-center px-3 text-xs">💰 이 매물 중개보수 계산</Link>
      {listing.status !== "광고 중" ? (
        <p className="mx-card p-5 text-sm text-mx-muted">「광고 중」인 매물만 안내할 수 있어요. 목록에서 상태를 바꿔 주세요.</p>
      ) : (
        <SendAdForm
          listingId={listing.id}
          draft={draftBody(listing)}
          header={adHeader(o)}
          footer={adFooter(o, "https://realty-client-desk.buylife.xyz/u/(고객마다 다름)")}
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
