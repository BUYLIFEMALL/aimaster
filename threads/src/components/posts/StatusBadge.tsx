import { clsx } from "@/lib/clsx";
import { POST_STATUS_LABELS, type PostStatus } from "@/types/post";

const STATUS_CLASSES: Record<PostStatus, string> = {
  draft: "bg-neutral-800 text-neutral-300 border border-neutral-700",
  scheduled: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  publishing: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  published: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  failed: "bg-red-500/20 text-red-300 border border-red-500/30",
};

export function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
    >
      {POST_STATUS_LABELS[status]}
    </span>
  );
}
