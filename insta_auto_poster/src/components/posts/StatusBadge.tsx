import { clsx } from "@/lib/clsx";
import { POST_STATUS_LABELS, type PostStatus } from "@/types/post";

const STATUS_CLASSES: Record<PostStatus, string> = {
  draft: "bg-slate-800 text-slate-300 border border-slate-700",
  scheduled: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  publishing: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  published: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  failed: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
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
