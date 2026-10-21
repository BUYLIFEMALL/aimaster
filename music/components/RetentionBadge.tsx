import { retentionDaysLeft, retentionDeleteAt, RETENTION_DAYS } from "@/lib/retention";

// 생성 콘텐츠 30일 자동 삭제 안내(2026-10-21, lib/retention.ts). 곡·리믹스 카드 상태 표시 옆에 붙는다.
export function RetentionBadge({ createdAt }: { createdAt: string }) {
  const left = retentionDaysLeft(createdAt);
  const date = retentionDeleteAt(createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });
  const urgent = left <= 3;
  return (
    <span
      title={`생성 ${RETENTION_DAYS}일 뒤 자동 삭제됩니다(${date}). 필요한 곡은 미리 내려받아 주세요.`}
      className={`px-2 py-1 rounded-full text-[11px] font-bold shrink-0 border ${
        urgent ? "bg-rose-950/40 text-rose-300 border-rose-500/30" : "bg-zinc-900 text-zinc-400 border-zinc-700"
      }`}
    >
      🗓️ 자동 삭제 D-{left}
    </span>
  );
}

/** 목록 위에 붙이는 안내 문구. */
export function RetentionNotice() {
  return (
    <p className="mb-4 text-xs text-amber-200 bg-amber-950/30 border border-amber-500/30 rounded-xl px-4 py-2.5">
      🗓️ 만든 곡·리믹스는 개인정보·저장 공간 보호를 위해 <strong>생성 {RETENTION_DAYS}일 뒤 자동 삭제</strong>됩니다(이미 30일이 지난
      곡은 10월 28일까지 유예). 오래 보관할 곡은 카드에서 미리 내려받아 주세요.
    </p>
  );
}
