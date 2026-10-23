// 공용 기준 코드 `pending-review-list` — 대시보드 「검토를 기다리는 ○○」 목록.
// 기준: instagram-comment-reply/components/PendingReviewList.tsx — 사본(threads-comment-reply·youtube-auto-reply)은 직접 고치지 말고
// 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 프로그램별 색은 classes로 넘긴다.
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/StudioHeader";
import { formatDateTimeKo } from "@/lib/formatDate";

export type PendingReviewItem = {
  id: string;
  /** 누르면 이동할 검토 화면 주소(예: /comments#media-<id>) */
  href: string;
  /** 아바타 글자·색을 정하는 이름 */
  avatarName: string | null;
  /** 화면에 보이는 작성자 표시(예: @user, 익명) */
  authorLabel: string;
  /** 받은 시각(ISO) */
  at: string;
  text: string;
  /** 시각 옆에 붙는 배지(예: DM 답장 가능 시간) */
  meta?: ReactNode;
  /** 본문 아래 작은 글(예: 🧵 글 앞부분) */
  subText?: string | null;
  thumbUrl?: string | null;
  thumbAlt?: string;
  /** square = 게시물(40px), wide = 영상(16:10) */
  thumbShape?: "square" | "wide";
};

export type PendingReviewListClasses = {
  /** 본문 글자색(예: text-ig-text) */
  text: string;
  /** 흐린 글자색(예: text-ig-muted) */
  muted: string;
  /** 마우스를 올렸을 때 배경(예: hover:bg-ig-raised) */
  hover: string;
};

export function PendingReviewList({
  items,
  empty,
  classes,
}: {
  items: PendingReviewItem[];
  /** 항목이 없을 때 보여 줄 내용 */
  empty: ReactNode;
  classes: PendingReviewListClasses;
}) {
  if (items.length === 0) return <>{empty}</>;
  return (
    // 휴대폰(767px 이하)에서는 손가락으로 누르기 쉽게 항목 높이를 키운다(최소 44px). 데스크톱은 예전 간격 그대로.
    <ul className="space-y-1 md:space-y-4">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={item.href} className={`-mx-2 flex min-h-[44px] items-start gap-3 rounded-lg px-2 py-3 md:min-h-0 md:py-1 ${classes.hover}`}>
            <Avatar name={item.avatarName} size={32} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className={`font-semibold ${classes.text}`}>{item.authorLabel}</span>
                <span className={classes.muted}>{formatDateTimeKo(item.at)}</span>
                {item.meta}
              </p>
              <p className={`mt-0.5 line-clamp-2 break-words text-sm ${classes.text}`}>{item.text}</p>
              {item.subText && <p className={`mt-1 truncate text-[11px] ${classes.muted}`}>{item.subText}</p>}
            </div>
            {item.thumbUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbUrl}
                alt={item.thumbAlt ?? "썸네일"}
                className={`${item.thumbShape === "wide" ? "h-10 w-16" : "h-10 w-10"} shrink-0 rounded-md object-cover`}
              />
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
