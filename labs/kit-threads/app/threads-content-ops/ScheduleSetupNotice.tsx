import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { IS_STANDALONE } from "@/threads-content-ops/lib/deployment";

// 설치 키트(독립 운영) 전용: 예약 발행에는 1분 자동 실행 연결이 따로 필요하다는 안내(2026-10-19).
// 지침: 루트 docs/SCHEDULER_POLICY.md (설정은 키 한 줄, 예약은 포스팅 쪽, 보관함 일시정지·재개).
export default function ScheduleSetupNotice() {
  if (!IS_STANDALONE) return null;
  return <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
    <CalendarClock size={15} className="mt-0.5 shrink-0" />
    <span>예약 발행 기본 방식은 <strong>내 cron-job.org</strong>(무료)입니다. API 키만 등록하면 예약할 때 자동으로 연결되고 예약이 없으면 자동으로 멈춥니다(Vercel 유료 Pro라면 KIT 스크립트로 Vercel 예약 호출을 켜고 선택할 수 있음). <Link className="font-semibold underline" href="/threads-content-ops?tab=settings">API키등록·플랫폼연동 → ⏰ 예약 발행</Link></span>
  </p>;
}
