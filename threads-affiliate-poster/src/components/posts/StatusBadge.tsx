import { clsx } from "@/lib/clsx";
import { POST_STATUS_LABELS, type PostStatus } from "@/types/post";

const STATUS_CLASSES: Record<PostStatus, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  scheduled: "bg-blue-100 text-blue-700",
  publishing: "bg-amber-100 text-amber-700",
  published: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
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
