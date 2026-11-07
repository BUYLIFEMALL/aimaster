// 「모든 음악」 필터·정렬 — 원본 boks-music `src/App.tsx`(MIT, © 2026 boksajang)의 목록 필터·정렬 규칙을 옮김(2026-11-06).
// 원본의 「LRC 확인 필요·가사 시간 없음」 필터는 가사 시간 기능(묶음 8) 때 더한다. 순수 함수 — 시험 tests/trackFilters.test.mjs.

export type TrackFilter = "all" | "vocal" | "instrumental" | "cover" | "noArt" | "noTiming" | "timingReview";
export type TrackSort = "manual" | "newest" | "oldest" | "title" | "longest" | "shortest";

export const FILTER_LABEL: Record<TrackFilter, string> = {
  all: "전체",
  vocal: "보컬곡",
  instrumental: "연주곡",
  cover: "커버·부분 수정",
  noArt: "앨범 그림 없음",
  noTiming: "가사 시간 없음",
  timingReview: "LRC 확인 필요",
};
export const SORT_LABEL: Record<TrackSort, string> = {
  manual: "직접 정한 순서",
  newest: "최신순",
  oldest: "오래된 순",
  title: "제목순",
  longest: "긴 곡부터",
  shortest: "짧은 곡부터",
};

type Row = {
  id: string;
  title: string;
  lyrics: string;
  kind: string;
  duration_sec: number;
  created_at: string;
  lyric_timing?: { cues: { start: number | null; status: string }[] } | null;
};

const collator = new Intl.Collator(["ko", "en"], { numeric: true, sensitivity: "base" });

/** 가사가 비었거나 [태그]만 있으면 연주곡 */
export const isInstrumental = (t: { lyrics: string }) => !t.lyrics.replace(/\[[^\]]*\]/g, "").trim();

export function filterTracks<T extends Row>(list: T[], filter: TrackFilter, hasArt: (id: string) => boolean): T[] {
  switch (filter) {
    case "vocal":
      return list.filter((t) => !isInstrumental(t));
    case "instrumental":
      return list.filter(isInstrumental);
    case "cover":
      return list.filter((t) => t.kind === "cover" || t.kind === "repaint");
    case "noArt":
      return list.filter((t) => !hasArt(t.id));
    // 가사 시간(2026-11-06) — 가사가 바뀐 경우까지 가리는 정확한 판정은 곡 상세 배지가 한다(지문 계산)
    case "noTiming":
      return list.filter((t) => !isInstrumental(t) && !t.lyric_timing?.cues?.some((c) => c.start !== null));
    case "timingReview":
      return list.filter((t) => !!t.lyric_timing?.cues?.some((c) => c.status === "review" || c.start === null));
    default:
      return list;
  }
}

/** manual이면 받은 순서 그대로(플레이리스트 순서·서버의 최신순) */
export function sortTracks<T extends Row>(list: T[], sort: TrackSort): T[] {
  const time = (t: T) => Date.parse(t.created_at) || 0;
  const by: Partial<Record<TrackSort, (a: T, b: T) => number>> = {
    newest: (a, b) => time(b) - time(a),
    oldest: (a, b) => time(a) - time(b),
    title: (a, b) => collator.compare(a.title, b.title),
    longest: (a, b) => b.duration_sec - a.duration_sec,
    shortest: (a, b) => a.duration_sec - b.duration_sec,
  };
  const cmp = by[sort];
  return cmp ? [...list].sort(cmp) : list;
}
