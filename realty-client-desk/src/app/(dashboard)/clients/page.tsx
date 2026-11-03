import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { deleteClientAction, updateClientAction } from "@/lib/actions/desk";
import { CLIENT_STATUSES, DEAL_TYPES } from "@/lib/desk/consent";
import { adEligibility } from "@/lib/desk/adRules";
import { AddClientForm } from "@/components/desk/AddClientForm";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
type Client = {
  id: string; name: string; phone: string; deal_type: string; regions: string | null; property_types: string[];
  budget_min: number | null; budget_max: number | null; monthly_max: number | null; area_min: number | null; move_in: string | null; memo: string | null;
  source: string; consent_at: string; consent_method: string; ad_consent_at: string | null; ad_optout_at: string | null; status: string; created_at: string;
};

const won = (v: number | null) => (v === null ? "" : v >= 10000 ? `${(v / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억` : `${v.toLocaleString("ko-KR")}만`);
const day = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
const SOURCE: Record<string, string> = { intake: "접수 링크", manual: "직접 입력", excel: "엑셀" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ deal?: string; status?: string }> }) {
  const user = await requireProgramAccess();
  const sp = await searchParams;
  const db = (await createClient()) as unknown as SupabaseLike;
  let q = db.from("realty_desk_clients").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
  if (sp.deal && (DEAL_TYPES as readonly string[]).includes(sp.deal)) q = q.eq("deal_type", sp.deal);
  if (sp.status && (CLIENT_STATUSES as readonly string[]).includes(sp.status)) q = q.eq("status", sp.status);
  const { data } = await q;
  const clients = (data ?? []) as Client[];
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const chip = (key: "deal" | "status", v?: string) => {
    const params = new URLSearchParams();
    if (key === "deal" ? v : sp.deal) params.set("deal", (key === "deal" ? v : sp.deal) as string);
    if (key === "status" ? v : sp.status) params.set("status", (key === "status" ? v : sp.status) as string);
    const qs = params.toString();
    return `/clients${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHero badge="👥 관심고객" title="관심고객 명부" description="접수 링크로 들어온 고객과 직접 입력한 고객이 함께 보여요. 내 사무소 고객만 보이고, 마지막 상담일부터 1년 보관해요." />
      <AddClientForm today={today} />
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={chip("deal", undefined)} className={!sp.deal ? "mx-chip-blue" : "mx-chip"}>전체 거래</Link>
        {DEAL_TYPES.map((d) => <Link key={d} href={chip("deal", d)} className={sp.deal === d ? "mx-chip-blue" : "mx-chip"}>{d}</Link>)}
        <span className="mx-2 text-mx-muted">|</span>
        <Link href={chip("status", undefined)} className={!sp.status ? "mx-chip-blue" : "mx-chip"}>전체 상태</Link>
        {CLIENT_STATUSES.map((s) => <Link key={s} href={chip("status", s)} className={sp.status === s ? "mx-chip-blue" : "mx-chip"}>{s}</Link>)}
      </div>
      {clients.length === 0 ? (
        <p className="mx-card p-5 text-sm text-mx-muted">아직 고객이 없어요. <Link href="/intake" className="text-mx-link underline">고객 접수 링크</Link>를 만들어 공유하거나 위에서 직접 넣어 주세요.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {clients.map((c) => (
            <li key={c.id} className="mx-card p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-bold text-mx-text">{c.name} <span className="ml-1 text-sm font-normal text-mx-muted">{c.phone}</span></p>
                  <p className="text-mx-text">
                    <b>{c.deal_type}</b>
                    {c.regions ? ` · ${c.regions}` : ""}
                    {c.property_types.length ? ` · ${c.property_types.join(", ")}` : ""}
                    {c.budget_min || c.budget_max ? ` · ${won(c.budget_min)}~${won(c.budget_max)}` : ""}
                    {c.monthly_max ? ` · 월 ${won(c.monthly_max)} 이하` : ""}
                    {c.area_min ? ` · ${c.area_min}㎡ 이상` : ""}
                    {c.move_in ? ` · 입주 ${c.move_in}` : ""}
                  </p>
                  {c.memo && <p className="mt-1 whitespace-pre-wrap text-mx-muted">{c.memo}</p>}
                  <p className="mt-1 text-xs text-mx-muted">
                    {SOURCE[c.source] ?? c.source} · 수집 동의 {day(c.consent_at)}({c.consent_method}) · 광고 문자{" "}
                    {c.ad_optout_at ? `수신거부(${day(c.ad_optout_at)})` : c.ad_consent_at ? `동의(${day(c.ad_consent_at)})` : "미동의"}
                    {(() => {
                      const e = adEligibility(c);
                      if (c.ad_consent_at && !c.ad_optout_at && !e.ok) return <b className="ml-1 text-mx-danger">· 광고 동의 2년 지남 — 다시 받아 주세요</b>;
                      if (e.ok && e.soon) return <b className="ml-1 text-[#8a5300]">· 광고 동의 2년이 곧 돼요</b>;
                      return null;
                    })()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={updateClientAction} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={c.id} />
                    <select name="status" defaultValue={c.status} aria-label="상태" className="mx-input min-h-[40px] w-auto py-1">
                      {CLIENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button type="submit" className="mx-btn-ghost min-h-[40px] px-3 text-xs">상태 저장</button>
                  </form>
                  {c.ad_consent_at && !c.ad_optout_at && (
                    <form action={updateClientAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="adOptout" value="1" />
                      <button type="submit" className="mx-btn-ghost min-h-[40px] px-3 text-xs">광고 수신거부 처리</button>
                    </form>
                  )}
                  <form action={deleteClientAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="mx-btn-danger min-h-[40px] px-3 text-xs">🗑 삭제</button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
