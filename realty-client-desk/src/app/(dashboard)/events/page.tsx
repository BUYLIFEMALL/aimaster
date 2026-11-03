import type { SupabaseClient } from "@supabase/supabase-js";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteEventAction, toggleEventDoneAction } from "@/lib/actions/events";
import { daysLeft, kstDate } from "@/lib/desk/eventRules";
import { memberSchedulerState } from "@/lib/schedulerMember/memberScheduler";
import { AddEventForm } from "@/components/desk/AddEventForm";
import { SchedulePublishingControl } from "@/components/desk/SchedulePublishingControl";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
type Ev = { id: string; kind: string; title: string; event_at: string; notify_days: number; notified_at: string | null; done: boolean; memo: string | null; client_id: string | null; listing_id: string | null };

const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });

export default async function EventsPage() {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: rows }, { data: clients }, { data: listings }, { data: account }, sched] = await Promise.all([
    db.from("realty_desk_events").select("*").eq("user_id", user.id).gte("event_at", since).order("event_at").limit(300),
    db.from("realty_desk_clients").select("id, name").eq("user_id", user.id).order("created_at", { ascending: false }).limit(300),
    db.from("realty_desk_listings").select("id, title").eq("user_id", user.id).order("created_at", { ascending: false }).limit(300),
    db.from("user_solapi_accounts").select("user_id").eq("user_id", user.id).maybeSingle(),
    memberSchedulerState(createAdminClient() as unknown as SupabaseClient, user.id),
  ]);
  const events = (rows ?? []) as Ev[];
  const nameOf = new Map<string, string>((clients ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
  const titleOf = new Map<string, string>((listings ?? []).map((l: { id: string; title: string }) => [l.id, l.title]));
  const today = kstDate(new Date());
  const upcoming = events.filter((e) => !e.done && kstDate(new Date(e.event_at)) >= today);
  const past = events.filter((e) => e.done || kstDate(new Date(e.event_at)) < today).reverse();

  const row = (e: Ev) => {
    const n = daysLeft(e.event_at);
    return (
      <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
        <div className="min-w-0">
          <p className={`font-bold ${e.done ? "text-mx-muted line-through" : "text-mx-text"}`}>
            <span className="mx-chip mr-1">{e.kind}</span>{e.title}
            {!e.done && n >= 0 && <span className={`ml-2 text-xs ${n <= 1 ? "text-mx-danger" : "text-mx-muted"}`}>{n === 0 ? "오늘" : `D-${n}`}</span>}
          </p>
          <p className="text-mx-muted">{when(e.event_at)}{e.client_id && nameOf.get(e.client_id) ? ` · 👤 ${nameOf.get(e.client_id)}` : ""}{e.listing_id && titleOf.get(e.listing_id) ? ` · 🏠 ${titleOf.get(e.listing_id)}` : ""}</p>
          <p className="text-xs text-mx-muted">알림: {e.notify_days === 0 ? "당일" : `${e.notify_days}일 전`} 아침 8시 · {e.notified_at ? "✅ 알림 보냄" : "아직 안 보냄"}</p>
          {e.memo && <p className="mt-1 whitespace-pre-wrap text-mx-muted">{e.memo}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={toggleEventDoneAction}>
            <input type="hidden" name="id" value={e.id} />
            <input type="hidden" name="done" value={e.done ? "0" : "1"} />
            <button type="submit" className="mx-btn-ghost min-h-[40px] px-3 text-xs">{e.done ? "↩ 다시 진행" : "✔ 끝남"}</button>
          </form>
          <form action={deleteEventAction}>
            <input type="hidden" name="id" value={e.id} />
            <button type="submit" className="mx-btn-danger min-h-[40px] px-3 text-xs">🗑 삭제</button>
          </form>
        </div>
      </li>
    );
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHero badge="📅 일정" title="임장·계약·잔금·만기 일정" description="일정을 넣으면 정한 날 아침 8시에 내 핸드폰으로 문자가 가요(본인 SOLAPI 계정, 고객에게는 가지 않아요)." />
      <SchedulePublishingControl initial={sched} />
      {!account && <p className="rounded-lg bg-[#fff4e5] p-3 text-sm text-[#8a5300]">⚙️ 문자 알림을 받으려면 <a href="/settings" className="underline">API키등록·플랫폼연동</a>에서 본인 SOLAPI 계정을 넣어 주세요. 넣기 전에도 일정은 이 화면과 대시보드에 보여요.</p>}
      <AddEventForm today={today} clients={clients ?? []} listings={listings ?? []} />
      <div className="mx-card p-5">
        <h2 className="text-base font-bold text-mx-text">다가오는 일정 {upcoming.length}개</h2>
        {upcoming.length === 0 ? <p className="mt-2 text-sm text-mx-muted">다가오는 일정이 없어요.</p> : <ul className="divide-y divide-mx-border">{upcoming.map(row)}</ul>}
      </div>
      {past.length > 0 && (
        <details className="mx-card p-5">
          <summary className="cursor-pointer text-base font-bold text-mx-text">지난 일정·끝난 일정 {past.length}개 (최근 30일)</summary>
          <ul className="divide-y divide-mx-border">{past.map(row)}</ul>
        </details>
      )}
    </div>
  );
}
