import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, ExternalLink, AlertTriangle, Repeat } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getMemberRecurring, getMemberSchedules, isOverdue, nextSchedule, formatScheduleDay, formatScheduleTime, PLATFORM_LABEL, type MemberSchedule, type SnsPlatform } from "@/lib/schedules/memberSchedules";

const BADGE: Record<SnsPlatform, string> = {
  instagram: "bg-pink-500/15 text-pink-300",
  threads: "bg-slate-500/20 text-slate-200",
  naver_blog: "bg-emerald-500/15 text-emerald-300",
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = { title: "내 예약 현황" };

// 「📅 내 예약 현황」(2026-10-20) — 예약 게시 9개 프로그램 + 정기 자동 실행 7개를 한 화면에(보기 전용, 취소·변경은 각 프로그램에서).
export default async function SchedulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/schedules");

  const service = createServiceClient();
  const [schedules, recurring] = await Promise.all([getMemberSchedules(service, user.id), getMemberRecurring(service, user.id)]);
  const conflicts = schedules.filter((s) => s.conflict).length;
  const days = new Map<string, MemberSchedule[]>();
  for (const s of schedules) {
    const day = formatScheduleDay(s.scheduledAt);
    days.set(day, [...(days.get(day) ?? []), s]);
  }
  const byProgram = new Map<string, number>();
  for (const s of schedules) byProgram.set(s.programName, (byProgram.get(s.programName) ?? 0) + 1);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-gold" /> 내 예약 현황
        </h1>
        <p className="text-subtext text-sm mt-1 break-keep">
          인스타그램·쓰레드·네이버 블로그 예약 게시와, 규칙을 켜 두면 주기마다 도는 정기 자동 실행을 한 화면에 모았습니다. 취소·수정은 「○○에서 보기」를 눌러 그 프로그램에서 해 주세요.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-black gold-text">{schedules.length}건</div>
          <div className="text-subtext text-xs mt-1">남은 예약</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-lg font-black text-white">{nextSchedule(schedules) ? formatScheduleTime(nextSchedule(schedules)!.scheduledAt) : "-"}</div>
          <div className="text-subtext text-xs mt-1">다음 게시</div>
        </GlassCard>
        <GlassCard className="p-4 text-center col-span-2 md:col-span-1">
          <div className={`text-2xl font-black ${conflicts ? "text-amber-400" : "text-emerald-400"}`}>{conflicts ? `${conflicts}건` : "없음"}</div>
          <div className="text-subtext text-xs mt-1">30분 안 겹침</div>
        </GlassCard>
      </div>

      {conflicts > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200" role="alert">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="break-keep">같은 SNS에 30분 안으로 붙은 예약이 있습니다. 같은 계정에 게시물이 연달아 올라가면 노출이 줄 수 있으니, 필요하면 한쪽 시각을 옮겨 주세요.</span>
        </div>
      )}

      {schedules.length === 0 ? (
        <GlassCard className="p-8 text-center text-subtext text-sm">
          남은 예약이 없습니다. 각 프로그램의 「예약 게시」로 예약하면 여기에 모여 보입니다.
        </GlassCard>
      ) : (
        <div className="space-y-5">
          {[...days.entries()].map(([day, list]) => (
            <section key={day}>
              <h2 className="text-sm font-bold text-white mb-2">{day} <span className="text-subtext font-normal">· {list.length}건</span></h2>
              <ul className="space-y-2">
                {list.map((s) => (
                  <li key={s.key}>
                    <GlassCard className={`p-3 flex flex-wrap items-center gap-x-3 gap-y-1 ${s.conflict ? "border border-amber-500/50" : ""}`}>
                      <span className="font-bold text-white tabular-nums">{formatScheduleTime(s.scheduledAt).split(" ").pop()}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${BADGE[s.platform]}`}>{PLATFORM_LABEL[s.platform]}</span>
                      <span className="text-xs text-gold">{s.programName}</span>
                      {s.account && <span className="text-xs text-subtext">@{s.account}</span>}
                      {s.conflict && <span className="text-xs font-bold text-amber-400">⚠️ 30분 안 겹침</span>}
                      {isOverdue(s) && <span className="text-xs font-bold text-sky-300" title="예약 시각이 지났지만 아직 게시 완료로 바뀌지 않았습니다. 프로그램에서 처리 상태를 확인해 주세요.">⏳ 시각 지남 · 처리 확인 필요</span>}
                      <span className="w-full sm:w-auto sm:flex-1 text-sm text-subtext truncate">{s.text}</span>
                      {s.programUrl && (
                        <Link href={s.programUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-gold hover:underline">
                          {s.programName.replace(/ 자동화$/, "")}에서 보기 <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </GlassCard>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section>
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1"><Repeat className="w-5 h-5 text-gold" /> 정기 자동 실행</h2>
        <p className="text-subtext text-xs mb-3 break-keep">규칙을 켜 두면 정해진 주기마다 자동으로 실행되는 프로그램입니다(예약 리마인드·CRM·카카오·네이버 카페·스텝메일·상품소싱·유튜브 댓글).</p>
        {recurring.length === 0 ? (
          <GlassCard className="p-5 text-center text-subtext text-sm">켜 둔 정기 자동 실행이 없습니다.</GlassCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recurring.map((r) => (
              <GlassCard key={r.programSlug} className="p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{r.programName}</span>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${r.state === "paused" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                    {r.state === "paused" ? "⏸ 일시정지" : "● 실행 중"}
                  </span>
                </div>
                <div className="text-sm text-subtext">{r.workLabel} <b className="text-white">{r.work}개</b> · 실행 방식 {r.modeLabel}</div>
                {r.programUrl && (
                  <Link href={r.programUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-gold hover:underline">
                    {r.programName.replace(/ 자동화$/, "")}에서 보기 <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {byProgram.size > 0 && (
        <p className="text-xs text-subtext">
          프로그램별: {[...byProgram.entries()].map(([name, n]) => `${name} ${n}건`).join(" · ")}
        </p>
      )}
    </div>
  );
}
