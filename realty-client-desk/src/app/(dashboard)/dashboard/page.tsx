import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const count = async (build: (q: any) => any) => (await build(db.from("realty_desk_clients").select("id", { count: "exact", head: true }).eq("user_id", user.id))).count ?? 0; // eslint-disable-line @typescript-eslint/no-explicit-any
  const [all, active, week, ad] = await Promise.all([
    count((q) => q),
    count((q) => q.eq("status", "상담 중")),
    count((q) => q.gte("created_at", weekAgo)),
    count((q) => q.not("ad_consent_at", "is", null).is("ad_optout_at", null)),
  ]);
  const { count: links } = await db.from("realty_desk_intake_links").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true);
  const { count: listingCount } = await db.from("realty_desk_listings").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "광고 중");
  const { data: soon } = await db.from("realty_desk_events").select("id, kind, title, event_at").eq("user_id", user.id).eq("done", false)
    .gte("event_at", new Date(Date.now() - 12 * 3_600_000).toISOString()).lte("event_at", new Date(Date.now() + 7 * 86_400_000).toISOString()).order("event_at").limit(8);
  const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });

  const cards = [
    { label: "전체 관심고객", value: all },
    { label: "상담 중", value: active },
    { label: "최근 7일 새 고객", value: week },
    { label: "광고 문자 동의", value: ad },
  ];
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHero badge="🏠 대시보드" title="AI 중개사무소 고객관리" description="매수·임대 관심고객을 동의와 함께 모으고, 내 매물과 맞는 고객에게 안내 문자를 보내고, 임장·계약·잔금·만기 일정을 아침 8시에 알려 드려요." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="mx-kpi">
            <p className="text-xs text-mx-muted">{c.label}</p>
            <p className="mt-1 text-2xl font-black text-mx-text">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mx-card p-5 text-sm text-mx-text">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="mx-section-title">📅 7일 안 일정</h2><Link href="/events" className="text-mx-link underline">일정 전체 보기</Link></div>
        {(soon ?? []).length === 0 ? <p className="mt-2 text-mx-muted">7일 안에 잡힌 일정이 없어요.</p> : (
          <ul className="mt-2 space-y-1">{(soon ?? []).map((e: { id: string; kind: string; title: string; event_at: string }) => <li key={e.id}><span className="mx-chip mr-1">{e.kind}</span>{when(e.event_at)} · {e.title}</li>)}</ul>
        )}
        <p className="mt-2 text-xs text-mx-muted">🏠 광고 중 매물 {listingCount ?? 0}개 · <Link href="/listings" className="underline">내 매물</Link></p>
      </div>
      <div className="mx-card space-y-2 p-5 text-sm text-mx-text">
        <h2 className="mx-section-title">🚀 시작하기</h2>
        <p>1. <Link href="/intake" className="text-mx-link underline">고객 접수 링크</Link>를 만듭니다{links ? ` (지금 받는 중 ${links}개)` : ""}.</p>
        <p>2. 링크를 문자·블로그·명함 QR에 붙여 공유합니다.</p>
        <p>3. <Link href="/clients" className="text-mx-link underline">관심고객</Link>에서 접수된 조건과 동의 기록을 확인하고, 전화 고객은 직접 넣습니다.</p>
        <p>4. <Link href="/settings" className="text-mx-link underline">API키등록·플랫폼연동</Link>에서 사무소 정보와 본인 SOLAPI를 넣고, <Link href="/listings" className="text-mx-link underline">내 매물</Link>에서 맞는 고객에게 안내합니다.</p>
        <p>5. <Link href="/events" className="text-mx-link underline">일정</Link>에 임장·계약·잔금·만기를 넣으면 아침 8시에 내 핸드폰으로 알려 드려요.</p>
        <p className="text-xs text-mx-muted">⚠️ 사무소 개인정보 처리방침에 「고객 명부 보관: Buylife」 「문자 발송: SOLAPI(본인 계정)」를 적어 주세요. 이 안내는 참고용이며 법률 자문이 아니에요.</p>
      </div>
    </div>
  );
}
