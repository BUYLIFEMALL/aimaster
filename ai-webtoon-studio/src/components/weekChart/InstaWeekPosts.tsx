"use client";

// 인스타 게시 기록 API 하나로 「📊 최근 7일 게시」 그래프 + 막대 누르면 그날 게시한 글 — 공용 기준 코드(docs/SHARED_MODULES.md 「insta-week-posts」).
// 기준: insta_auto_poster(카드뉴스 홈). 사본은 직접 고치지 말고 기준을 고친 뒤 node scripts/check-shared-modules.mjs --sync.
// 본인 게시 기록 API를 ?week=1(최근 7일 게시 완료만, 최대 500건)로 한 번 불러 날짜별로 센다. 테마 색은 부르는 쪽이 넘긴다.
// 썸네일: 게시 성공 때 첫 장만 남긴다(posting.ts removeImagesKeepThumb). 그 전 기록·정리된 장은 그림이 안 열려 WeekReplyPanel이 숨긴다.
import { useCallback, useEffect, useState } from "react";
import { WeekReplyPanel, type DayReplyItem, type PanelClasses } from "@/components/weekChart/WeekReplyPanel";
import { bucketByKstDay, previewText, publicImageUrl, weekDayRange, type DayCount } from "@/lib/weekChart/bucket";

type PostRow = {
  id: string;
  title?: string | null;
  caption?: string | null;
  status: string;
  published_at: string | null;
  permalink?: string | null;
  image_paths?: string[] | null;
};

const LABELS = {
  title: "📊 최근 7일 게시",
  noun: "게시",
  list: "게시한 글 목록",
  empty: "이날 게시한 글이 없어요.",
  more: "최근 {n}건까지 보여요.",
  replyIcon: "📝",
};

export function InstaWeekPosts({
  postsUrl,
  classes,
  cardClassName,
  defaultOpen = false,
  refreshEvent,
  imageBucket = "insta-post-images",
}: {
  /** 본인 게시 기록 API(GET ?week=1 → { posts: PostRow[] }, 최근 7일 게시 완료) */
  postsUrl: string;
  classes: PanelClasses;
  /** 바깥 카드 테두리·배경(프로그램 테마) */
  cardClassName: string;
  /** 처음부터 펼쳐 보일지(작업 화면은 접힌 한 줄) */
  defaultOpen?: boolean;
  /** 게시·예약 뒤 다시 불러올 브라우저 이벤트 이름 */
  refreshEvent?: string;
  /** 게시 이미지가 저장된 공개 저장소(썸네일용) */
  imageBucket?: string;
}) {
  const [rows, setRows] = useState<PostRow[] | null>(null);
  const [open, setOpen] = useState(defaultOpen);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${postsUrl}${postsUrl.includes("?") ? "&" : "?"}week=1`, { cache: "no-store" });
      const d = r.ok ? await r.json() : null;
      setRows(d?.posts ?? []);
    } catch {
      setRows([]); // 기록을 못 불러와도 다른 기능은 쓸 수 있다
    }
  }, [postsUrl]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!refreshEvent) return;
    const on = () => void load();
    window.addEventListener(refreshEvent, on);
    return () => window.removeEventListener(refreshEvent, on);
  }, [load, refreshEvent]);

  if (!rows) return null;
  const published = rows.filter((r) => r.status === "published" && r.published_at);
  const days: DayCount[] = bucketByKstDay(published.map((r) => r.published_at as string));
  const total = days.reduce((s, d) => s + d.count, 0);

  async function loadDay(key: string): Promise<{ items: DayReplyItem[] }> {
    const range = weekDayRange(key);
    if (!range) return { items: [] };
    return {
      items: published
        .filter((r) => (r.published_at as string) >= range.from && (r.published_at as string) < range.to)
        .sort((a, b) => ((a.published_at as string) < (b.published_at as string) ? 1 : -1))
        .map((r) => ({
          key: r.id,
          at: r.published_at as string,
          reply: previewText(r.caption || r.title),
          href: r.permalink ?? null,
          thumbUrl: publicImageUrl(r.image_paths, imageBucket),
        })),
    };
  }

  return (
    <div className={cardClassName}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 text-left text-sm font-bold ${open ? "mb-4" : ""}`}
      >
        <span>
          📊 최근 7일 게시 <span className={`font-normal ${classes.muted}`}>{total}건</span>
        </span>
        <span className={`text-xs font-normal ${classes.muted}`}>{open ? "접기 ▲" : "그래프 보기 ▼"}</span>
      </button>
      {open && <WeekReplyPanel days={days} loadDay={loadDay} classes={classes} labels={{ ...LABELS, title: "날짜별 게시" }} perPlatformLimit={500} />}
    </div>
  );
}
