// 공용 기준 코드 `review-group-header` — 검토 화면의 게시물·영상 「묶음 머리」(썸네일 또는 아이콘 · 제목 · 건수).
// 기준: instagram-comment-reply/components/ReviewGroupHeader.tsx — 사본(threads-comment-reply·youtube-auto-reply)은 직접 고치지 말고
// 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 프로그램별 색은 classes로 넘긴다.
import type { ReactNode } from "react";

export type ReviewGroupHeaderClasses = {
  /** 아래 구분선 색(예: border-ig-border) */
  border: string;
  /** 제목 글자색(예: text-ig-text) */
  text: string;
  /** 건수 글자색(예: text-ig-muted) */
  muted: string;
};

export function ReviewGroupHeader({
  title,
  countLabel,
  icon,
  thumbUrl,
  thumbHref,
  thumbTitle,
  thumbShape = "square",
  classes,
}: {
  title: string;
  /** 오른쪽 건수 표시(예: 댓글 3개) */
  countLabel: string;
  /** 썸네일이 없을 때 보이는 아이콘 */
  icon: ReactNode;
  thumbUrl?: string | null;
  /** 썸네일을 누르면 새 창으로 열 원본 주소 */
  thumbHref?: string | null;
  thumbTitle?: string;
  /** square = 게시물(40px), wide = 영상(16:10) */
  thumbShape?: "square" | "wide";
  classes: ReviewGroupHeaderClasses;
}) {
  const thumb = thumbUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumbUrl}
      alt={thumbTitle ?? "썸네일"}
      className={`${thumbShape === "wide" ? "h-10 w-16" : "h-10 w-10"} rounded-lg object-cover`}
    />
  ) : null;
  return (
    <h2 className={`flex items-center gap-2 border-b pb-3 text-sm font-bold ${classes.border} ${classes.text}`}>
      {thumb ? (
        thumbHref ? (
          <a href={thumbHref} target="_blank" rel="noreferrer" title={thumbTitle} className="shrink-0">
            {thumb}
          </a>
        ) : (
          <span className="shrink-0">{thumb}</span>
        )
      ) : (
        icon
      )}
      <span className="truncate">{title}</span>
      <span className={`ml-auto shrink-0 text-xs font-normal ${classes.muted}`}>{countLabel}</span>
    </h2>
  );
}
