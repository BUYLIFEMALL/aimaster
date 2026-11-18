// 접수 상태 분류 — 화면(대시보드·접수 내역·표)이 함께 쓰는 순수 함수. CRM-20261118-03.
// 기존 3개(received·notified·failed)의 라벨·색·필터·실패 개수는 그대로 두고,
// 중복 방지 2단계에서 생길 새 3개(dispatching·partial·unknown)와 목록 밖 값은 「확인 필요」로 따로 센다
// (실패 개수에 섞거나 0으로 숨기지 않음). 자동 재시도 안내는 쓰지 않는다 — 발송 여부가 불확실한 건은
// 사람이 확인해야 하기 때문(설계: .ai/results/PORT-20261118-02-CC-B2B-BACK-01.md 4-3절).
// DB 칼럼은 기존 status만 읽는다(dedupe_key 등 새 칸 조회 0 — 운영 옛 스키마와 호환).

export const SUBMISSION_STATUSES = ["received", "notified", "failed", "dispatching", "partial", "unknown"] as const;
export const REVIEW_STATUSES = ["dispatching", "partial", "unknown"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export interface StatusMeta {
  label: string;
  chip: string;
  review: boolean;
  hint?: string;
}

const META: Record<SubmissionStatus, StatusMeta> = {
  received: { label: "접수됨", chip: "mx-chip", review: false },
  notified: { label: "발송 완료", chip: "mx-chip-green", review: false },
  failed: { label: "발송 실패", chip: "mx-chip-red", review: false },
  dispatching: {
    label: "발송 처리 중",
    chip: "mx-chip-amber",
    review: true,
    hint: "결과가 아직 확정되지 않았습니다. 오래 이 상태면 발송 계정 쪽 기록을 확인해 주세요.",
  },
  partial: {
    label: "일부만 전송",
    chip: "mx-chip-amber",
    review: true,
    hint: "일부 채널만 전송됐습니다. 어떤 채널이 빠졌는지 확인이 필요합니다.",
  },
  unknown: {
    label: "결과 확인 필요",
    chip: "mx-chip-amber",
    review: true,
    hint: "발송 여부를 알 수 없어 자동으로 다시 보내지 않습니다. 발송 계정 기록에서 확인해 주세요.",
  },
};

function isKnown(status: string): status is SubmissionStatus {
  return (SUBMISSION_STATUSES as readonly string[]).includes(status);
}

/** 상태 라벨·색. 목록 밖 값도 숨기지 않고 「확인 필요」로 보여 준다. */
export function statusMeta(status: string): StatusMeta {
  if (isKnown(status)) return META[status];
  return {
    label: `확인 필요(${status || "빈 값"})`,
    chip: "mx-chip-amber",
    review: true,
    hint: "알 수 없는 상태 값입니다. 관리자에게 알려 주세요.",
  };
}

export interface StatusCounts {
  total: number;
  received: number;
  notified: number;
  failed: number;
  dispatching: number;
  partial: number;
  unknown: number;
  /** 목록 밖 값 */
  other: number;
  /** dispatching + partial + unknown + other */
  review: number;
}

export function countSubmissionStatuses(rows: ReadonlyArray<{ status: string }>): StatusCounts {
  const c: StatusCounts = { total: 0, received: 0, notified: 0, failed: 0, dispatching: 0, partial: 0, unknown: 0, other: 0, review: 0 };
  for (const r of rows) {
    c.total += 1;
    if (isKnown(r.status)) c[r.status] += 1;
    else c.other += 1;
  }
  c.review = c.dispatching + c.partial + c.unknown + c.other;
  return c;
}

export type StatusFilter = "all" | "received" | "notified" | "failed" | "review";

export const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "received", label: "접수됨" },
  { value: "notified", label: "발송 완료" },
  { value: "failed", label: "발송 실패" },
  { value: "review", label: "확인 필요" },
];

export function matchesStatusFilter(status: string, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "review") return statusMeta(status).review;
  return status === filter;
}

/** 오류 원문은 기존처럼 failed일 때만 보인다(표시 범위 확대 0). */
export function showsErrorMessage(status: string): boolean {
  return status === "failed";
}

/** 대시보드 「확인 필요」 개수 조회용 — supabase-js `.not("status", "in", REVIEW_STATUS_NOT_IN)` */
export const REVIEW_STATUS_NOT_IN = "(received,notified,failed)";
