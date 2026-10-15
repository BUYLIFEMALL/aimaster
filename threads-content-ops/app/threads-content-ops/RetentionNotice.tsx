import { CalendarClock } from "lucide-react";
import { RETENTION_DAYS } from "@/threads-content-ops/lib/retention";

/** 생성 콘텐츠 30일 보관 안내 박스 — naver-blog-agent의 ContentRetentionNotice를 이 프로그램 화면(흰색 베이스)에 맞춰 이식. */
export default function RetentionNotice({ scope }: { scope: "viral" | "manage" }) {
  return <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
    <p className="flex items-start gap-2"><CalendarClock size={15} className="mt-0.5 shrink-0 text-amber-700" /><span>
      <b>🗓️ 생성 콘텐츠 보관 기간 안내:</b> 수집한 글감과 콘텐츠 보관함의 글은 만든 날부터 <b className="underline">{RETENTION_DAYS}일 동안만 보관</b>되고 이후 자동 삭제됩니다. 첨부한 이미지·영상 파일도 올린 지 {RETENTION_DAYS}일 뒤 함께 지워집니다.
      {scope === "viral"
        ? <> 오래 두고 쓸 글감은 <b>"보관하기"</b>(📦 보관 중)를 눌러 두면 자동 삭제에서 제외됩니다.</>
        : <> 검토 대기·발행 실패 글이 삭제 대상이며, 예약 대기 글과 발행 기록은 지워지지 않습니다. 남기고 싶은 글은 기간 안에 발행하거나 본문을 복사해 따로 보관해 주세요.</>}
    </span></p>
  </section>;
}
