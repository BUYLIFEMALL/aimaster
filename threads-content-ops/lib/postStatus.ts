export const POST_STATUS = {
  draft: { label: "검토 대기", tone: "bg-sky-50 text-sky-700" },
  scheduled: { label: "예약 대기", tone: "bg-amber-50 text-amber-800" },
  publishing: { label: "포스팅 중", tone: "bg-violet-50 text-violet-700" },
  published: { label: "포스팅완료", tone: "bg-emerald-50 text-emerald-700" },
  failed: { label: "재검토 필요", tone: "bg-rose-50 text-rose-700" },
} as const;

export type PostStatus = keyof typeof POST_STATUS;
export type PostCounts = Record<PostStatus, number>;
export const POST_STATUSES = Object.keys(POST_STATUS) as PostStatus[];

export function safePostLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)threads\.(net|com)$/.test(url.hostname) ? url.href : null;
  } catch { return null; }
}
