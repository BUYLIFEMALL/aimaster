import "server-only";
import { createClient } from "@/lib/supabase/server";
import { IS_STANDALONE } from "@/lib/deployment";
import { bucketByKstDay, previewText, weekStartIso, type DayCount } from "@/lib/weekChart/bucket";
import type { DayReplyItem } from "@/components/weekChart/WeekReplyPanel";

// v1.44 대시보드 「📊 최근 7일 게시」 — 인스타에 자동 게시하는 프로그램들의 게시 건수를 묶음별 색으로 함께 쌓는다.
// 표는 모두 같은 공용 DB에 있고 회원 본인 행만 읽기(RLS select_own) + user_id 필터. 게시 기록 표는 30일 뒤 자동 삭제라 7일 그래프에는 영향 없음.
// 이 프로그램의 형식 정의(Database)에는 다른 프로그램 표가 없어 조회만 형식 검사 밖으로 뺀다.
const ALL_SOURCES = [
  { key: "feed", table: "insta_posts", label: "📸 피드", color: "#ec4899", text: "caption", link: "ig_permalink" },
  { key: "cardnews", table: "cns_insta_posts", label: "🗂️ 카드뉴스", color: "#f59e0b", text: "caption", link: "permalink" },
  { key: "influencer", table: "aif_insta_posts", label: "🧑‍🎤 AI 인플루언서", color: "#a855f7", text: "caption", link: "permalink" },
  { key: "webtoon", table: "wts_insta_posts", label: "📚 웹툰", color: "#22c55e", text: "caption", link: "permalink" },
  { key: "fourcut", table: "fcc_insta_posts", label: "🎞️ 네컷", color: "#3b82f6", text: "caption", link: "permalink" },
] as const;

// 배포판(독립 모드) DB에는 다른 프로그램 표가 없어 피드만 센다
export const INSTA_SOURCES = IS_STANDALONE ? ALL_SOURCES.slice(0, 1) : ALL_SOURCES;

export const INSTA_SERIES = INSTA_SOURCES.map(({ key, label, color }) => ({ key, label, color }));

type Row = { id: string; published_at: string | null; [col: string]: unknown };
type Loose = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (c: string, v: string) => {
        eq: (c: string, v: string) => {
          gte: (c: string, v: string) => {
            lt: (c: string, v: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: Row[] | null; error: unknown }> } };
            limit: (n: number) => Promise<{ data: Row[] | null; error: unknown }>;
          };
        };
      };
    };
  };
};

async function db(): Promise<Loose> {
  return (await createClient()) as unknown as Loose;
}

/** 최근 7일 게시 건수(묶음별). 한 표가 실패해도 나머지는 그린다. */
export async function loadInstaWeek(userId: string): Promise<DayCount[]> {
  const supabase = await db();
  const now = Date.now();
  const since = weekStartIso(now);
  const lists = await Promise.all(
    INSTA_SOURCES.map(async (s) => {
      const { data } = await supabase.from(s.table).select("published_at").eq("user_id", userId).eq("status", "published").gte("published_at", since).limit(5000);
      return (data ?? []).filter((r) => r.published_at).map((r) => ({ at: r.published_at as string, series: s.key }));
    }),
  );
  return bucketByKstDay(lists.flat(), now);
}

/** 막대를 눌렀을 때 그날 게시한 글(묶음마다 최근 50건, 최근 것부터). */
export async function loadInstaDay(userId: string, range: { from: string; to: string }): Promise<{ items?: DayReplyItem[]; error?: string }> {
  const supabase = await db();
  let failed = 0;
  const lists = await Promise.all(
    INSTA_SOURCES.map(async (s) => {
      const { data, error } = await supabase
        .from(s.table)
        .select(`id, ${s.text}, ${s.link}, published_at`)
        .eq("user_id", userId)
        .eq("status", "published")
        .gte("published_at", range.from)
        .lt("published_at", range.to)
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) failed++;
      return (data ?? []).map((r) => ({
        key: `${s.key}-${r.id}`,
        tag: s.label,
        color: s.color,
        at: r.published_at as string,
        reply: previewText(r[s.text] as string | null),
        href: (r[s.link] as string | null) ?? null,
      }));
    }),
  );
  if (failed === INSTA_SOURCES.length) return { error: "그날 목록을 불러오지 못했습니다. 잠시 후 다시 눌러 주세요." };
  return { items: lists.flat().sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)) };
}
