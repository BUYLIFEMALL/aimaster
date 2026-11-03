import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { deleteListingAction, updateListingStatusAction } from "@/lib/actions/listings";
import { LISTING_STATUSES, matchReasons } from "@/lib/desk/adRules";
import { priceText } from "@/lib/desk/format";
import { AddListingForm } from "@/components/desk/AddListingForm";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
type Listing = { id: string; title: string; deal_type: string; property_type: string; address: string; price: number; monthly: number | null; area_m2: number | null; floor_info: string | null; status: string; created_at: string };

export default async function ListingsPage() {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  const [{ data: rows }, { data: clientRows }] = await Promise.all([
    db.from("realty_desk_listings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
    db.from("realty_desk_clients").select("deal_type, regions, property_types, budget_min, budget_max, monthly_max, area_min, status").eq("user_id", user.id).limit(2000),
  ]);
  const listings = (rows ?? []) as Listing[];
  const clients = clientRows ?? [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHero badge="🏠 내 매물" title="내 매물과 맞는 고객" description="매물을 넣으면 관심고객 조건(거래·종류·지역·예산·면적)과 맞춰 후보를 보여 줘요. 안내 문자는 고객을 직접 골라 보내요." />
      <AddListingForm />
      {listings.length === 0 ? (
        <p className="mx-card p-5 text-sm text-mx-muted">아직 매물이 없어요. 위 「➕ 매물 등록」에서 넣어 주세요.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {listings.map((l) => {
            const n = l.status === "광고 중" ? clients.filter((c: Parameters<typeof matchReasons>[0]) => matchReasons(c, l)).length : 0;
            return (
              <li key={l.id} className="mx-card p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-mx-text">{l.title} <span className={l.status === "광고 중" ? "mx-chip-blue ml-1" : "mx-chip ml-1"}>{l.status}</span></p>
                    <p className="text-mx-text">{l.property_type} · {priceText(l)}{l.area_m2 ? ` · 전용 ${l.area_m2}㎡` : ""}{l.floor_info ? ` · ${l.floor_info}` : ""}</p>
                    <p className="text-mx-muted">{l.address}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {l.status === "광고 중" && (
                      <Link href={`/listings/${l.id}`} className="mx-btn-primary inline-flex min-h-[40px] items-center px-3 text-xs">👥 맞는 고객 {n}명 보기</Link>
                    )}
                    <form action={updateListingStatusAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={l.id} />
                      <select name="status" defaultValue={l.status} aria-label="상태" className="mx-input min-h-[40px] w-auto py-1">
                        {LISTING_STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <button type="submit" className="mx-btn-ghost min-h-[40px] px-3 text-xs">상태 저장</button>
                    </form>
                    <form action={deleteListingAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <button type="submit" className="mx-btn-danger min-h-[40px] px-3 text-xs">🗑 삭제</button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
