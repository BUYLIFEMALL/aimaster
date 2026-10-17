import { clsx } from "@/lib/clsx";
import type { JobStatus } from "@/types/database.types";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: "대기 중",
  running: "수집 중",
  blocked: "확인 필요",
  completed: "완료",
  failed: "실패",
};

const STATUS_CLASSES: Record<JobStatus, string> = {
  pending: "bg-mx-raised text-mx-muted",
  running: "bg-mx-primary/15 text-mx-link",
  blocked: "bg-mx-accent/15 text-mx-accent",
  completed: "bg-mx-success/15 text-mx-success",
  failed: "bg-mx-danger/15 text-mx-danger",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
    >
      {status === "running" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mx-primary" />
      )}
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}
