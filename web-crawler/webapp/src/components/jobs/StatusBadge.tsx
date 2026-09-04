import { clsx } from "@/lib/clsx";
import type { JobStatus } from "@/types/database.types";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: "대기 중",
  running: "수집 중",
  completed: "완료",
  failed: "실패",
};

const STATUS_CLASSES: Record<JobStatus, string> = {
  pending: "bg-neutral-100 text-neutral-600",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
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
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />
      )}
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}
