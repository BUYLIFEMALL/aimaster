import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { formatScheduleTime, type MemberScheduleSummary } from "@/lib/schedules/memberSchedules";

// 홈 「내 작업대」 위 한 줄(2026-10-20) — 예약 게시·정기 자동 실행 요약. 둘 다 없으면 아무것도 보이지 않는다. 전체는 /schedules.
export default function ScheduleSummaryBar({ summary }: { summary: MemberScheduleSummary | null }) {
  if (!summary || (summary.count === 0 && summary.recurring === 0)) return null;
  return (
    <section className="px-4 pb-4">
      <Link
        href="/schedules"
        className="max-w-4xl mx-auto flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100 hover:bg-sky-500/15"
      >
        <CalendarClock className="w-4 h-4 text-sky-300 shrink-0" />
        <span className="font-bold">⏰ 예약 {summary.count}건 대기</span>
        {summary.next && <span className="text-sky-200/80">· 다음 게시 {formatScheduleTime(summary.next.scheduledAt)} ({summary.next.programName})</span>}
        {summary.conflicts > 0 && <span className="font-bold text-amber-300">· ⚠️ 30분 안 겹침 {summary.conflicts}건</span>}
        {summary.recurring > 0 && <span className="text-sky-200/80">· 🔁 정기 실행 {summary.recurring}개</span>}
        <span className="ml-auto inline-flex items-center gap-0.5 font-bold">내 예약 현황 <ChevronRight className="w-4 h-4" /></span>
      </Link>
    </section>
  );
}
