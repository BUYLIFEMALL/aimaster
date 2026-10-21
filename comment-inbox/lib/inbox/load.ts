import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";
import { bucketByKstDay, kstDayRange, kstTodayStartIso, weekStartIso, type DayCount } from "@/lib/weekChart/bucket";

// 통합 받은편지함 — 세 댓글 프로그램(INSTA 댓글·DM, 쓰레드, 유튜브)의 「검토 대기」 항목을 회원 본인 것만 모은다.
// 서비스 롤로 읽되 모든 조회에 user_id 필터. 원래 프로그램 이용 권한이 있는 플랫폼만 모은다
// (받은편지함이 유료 댓글 프로그램을 우회하는 통로가 되지 않게 — docs/PLAN_20261021_UNIFIED_COMMENT_INBOX.md).

export type InboxPlatform = "ig_comment" | "ig_dm" | "threads" | "youtube";

export const SOURCE_PROGRAMS = {
  instagram: { slug: "instagram-comment-reply", name: "INSTA 댓글·DM 자동화", url: "https://instagram-comment-reply.buylife.xyz" },
  threads: { slug: "threads-comment-reply", name: "쓰레드 댓글 자동화", url: "https://threads-comment-reply.buylife.xyz" },
  youtube: { slug: "youtube-auto-reply", name: "유튜브 댓글 자동화", url: "https://youtube-auto-reply.buylife.xyz" },
} as const;
export type SourceKey = keyof typeof SOURCE_PROGRAMS;

export const PLATFORM_SOURCE: Record<InboxPlatform, SourceKey> = {
  ig_comment: "instagram",
  ig_dm: "instagram",
  threads: "threads",
  youtube: "youtube",
};

export const PLATFORM_LABEL: Record<InboxPlatform, string> = {
  ig_comment: "인스타 댓글",
  ig_dm: "인스타 DM",
  threads: "쓰레드 댓글",
  youtube: "유튜브 댓글",
};

export type InboxItem = {
  platform: InboxPlatform;
  /** 원래 표의 행 id(ig_comments·dm_messages·th_comments·ytreply_comments) */
  id: string;
  avatarName: string | null;
  authorLabel: string;
  at: string;
  text: string;
  draft: string | null;
  /** 원래 프로그램 검토 화면의 그 묶음 주소 */
  sourceHref: string;
  thumbUrl: string | null;
  thumbShape: "square" | "wide";
  /** 어느 게시물·영상의 댓글인지(글 앞부분·영상 제목·캡션) */
  subText: string | null;
  /** DM만: 24시간 답장 창 남은 ms(지났으면 null) */
  dmLeftMs?: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const PER_PLATFORM_LIMIT = 100;

export type InboxAccess = Record<SourceKey, boolean>;

/** 원래 프로그램 이용 권한(정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+사용기간). */
// 레이아웃(메뉴 건수)과 화면이 같은 요청 안에서 함께 부르므로 react cache로 한 번만 실행
export const loadSourceAccess = cache(loadSourceAccessUncached);
async function loadSourceAccessUncached(userId: string): Promise<InboxAccess> {
  const admin = createAdminClient();
  const keys = Object.keys(SOURCE_PROGRAMS) as SourceKey[];
  const results = await Promise.all(keys.map((k) => checkProgramAccess(admin, userId, SOURCE_PROGRAMS[k].slug)));
  return Object.fromEntries(keys.map((k, i) => [k, results[i].allowed])) as InboxAccess;
}

/** 급한 순: 답장 창이 남은 DM(남은 시간 적은 순) → 댓글(오래된 순) → 답장 창이 지난 DM */
function urgencyRank(item: InboxItem): [number, number] {
  if (item.platform === "ig_dm") {
    if (item.dmLeftMs != null) return [0, item.dmLeftMs];
    return [2, new Date(item.at).getTime()];
  }
  return [1, new Date(item.at).getTime()];
}

export const loadInbox = cache(loadInboxUncached);
async function loadInboxUncached(userId: string, access: InboxAccess): Promise<InboxItem[]> {
  const admin = createAdminClient();
  const items: InboxItem[] = [];
  const now = Date.now();

  await Promise.all([
    // 인스타 댓글
    (async () => {
      if (!access.instagram) return;
      const { data: rows } = await admin
        .from("ig_comments")
        .select("id, media_id, author_username, comment_text, generated_reply, fetched_at")
        .eq("user_id", userId)
        .eq("status", "pending_review")
        .order("fetched_at", { ascending: true })
        .limit(PER_PLATFORM_LIMIT);
      if (!rows?.length) return;
      const ids = Array.from(new Set(rows.map((r) => r.media_id)));
      const { data: media } = await admin.from("ig_media").select("id, caption, thumbnail_url").eq("user_id", userId).in("id", ids);
      const byId = new Map((media ?? []).map((m) => [m.id, m]));
      for (const r of rows) {
        const m = byId.get(r.media_id);
        items.push({
          platform: "ig_comment",
          id: r.id,
          avatarName: r.author_username,
          authorLabel: r.author_username ? `@${r.author_username}` : "익명",
          at: r.fetched_at,
          text: r.comment_text,
          draft: r.generated_reply,
          sourceHref: `${SOURCE_PROGRAMS.instagram.url}/comments#media-${r.media_id}`,
          thumbUrl: m?.thumbnail_url ?? null,
          thumbShape: "square",
          subText: m?.caption ? `🖼️ ${m.caption}` : null,
        });
      }
    })(),
    // 인스타 DM
    (async () => {
      if (!access.instagram) return;
      const { data: rows } = await admin
        .from("dm_messages")
        .select("id, conversation_id, message_text, generated_reply, created_at")
        .eq("user_id", userId)
        .eq("direction", "in")
        .eq("status", "pending_review")
        .order("created_at", { ascending: true })
        .limit(PER_PLATFORM_LIMIT);
      if (!rows?.length) return;
      const ids = Array.from(new Set(rows.map((r) => r.conversation_id)));
      const { data: convs } = await admin
        .from("dm_conversations")
        .select("id, customer_username, last_inbound_at")
        .eq("user_id", userId)
        .in("id", ids);
      const byId = new Map((convs ?? []).map((c) => [c.id, c]));
      for (const r of rows) {
        const c = byId.get(r.conversation_id);
        const left = c?.last_inbound_at ? new Date(c.last_inbound_at).getTime() + DAY_MS - now : null;
        items.push({
          platform: "ig_dm",
          id: r.id,
          avatarName: c?.customer_username ?? null,
          authorLabel: c?.customer_username ? `@${c.customer_username}` : "고객",
          at: r.created_at,
          text: r.message_text,
          draft: r.generated_reply,
          sourceHref: `${SOURCE_PROGRAMS.instagram.url}/dm/conversations#conv-${r.conversation_id}`,
          thumbUrl: null,
          thumbShape: "square",
          subText: null,
          dmLeftMs: left != null && left > 0 ? left : null,
        });
      }
    })(),
    // 쓰레드 댓글
    (async () => {
      if (!access.threads) return;
      const { data: rows } = await admin
        .from("th_comments")
        .select("id, post_id, author_username, comment_text, generated_reply, fetched_at")
        .eq("user_id", userId)
        .eq("status", "pending_review")
        .order("fetched_at", { ascending: true })
        .limit(PER_PLATFORM_LIMIT);
      if (!rows?.length) return;
      const ids = Array.from(new Set(rows.map((r) => r.post_id)));
      const { data: posts } = await admin.from("th_posts").select("id, text").eq("user_id", userId).in("id", ids);
      const byId = new Map((posts ?? []).map((p) => [p.id, p]));
      for (const r of rows) {
        items.push({
          platform: "threads",
          id: r.id,
          avatarName: r.author_username,
          authorLabel: r.author_username ? `@${r.author_username}` : "익명",
          at: r.fetched_at,
          text: r.comment_text,
          draft: r.generated_reply,
          sourceHref: `${SOURCE_PROGRAMS.threads.url}/comments#post-${r.post_id}`,
          thumbUrl: null,
          thumbShape: "square",
          subText: `🧵 ${byId.get(r.post_id)?.text || "(삭제된 글)"}`,
        });
      }
    })(),
    // 유튜브 댓글
    (async () => {
      if (!access.youtube) return;
      const { data: rows } = await admin
        .from("ytreply_comments")
        .select("id, video_id, author_display_name, comment_text, generated_reply, fetched_at")
        .eq("user_id", userId)
        .eq("status", "pending_review")
        .order("fetched_at", { ascending: true })
        .limit(PER_PLATFORM_LIMIT);
      if (!rows?.length) return;
      const ids = Array.from(new Set(rows.map((r) => r.video_id)));
      const { data: videos } = await admin.from("ytreply_videos").select("id, title, thumbnail_url").eq("user_id", userId).in("id", ids);
      const byId = new Map((videos ?? []).map((v) => [v.id, v]));
      for (const r of rows) {
        const v = byId.get(r.video_id);
        items.push({
          platform: "youtube",
          id: r.id,
          avatarName: r.author_display_name,
          authorLabel: r.author_display_name ?? "익명",
          at: r.fetched_at,
          text: r.comment_text,
          draft: r.generated_reply,
          sourceHref: `${SOURCE_PROGRAMS.youtube.url}/comments#video-${r.video_id}`,
          thumbUrl: v?.thumbnail_url ?? null,
          thumbShape: "wide",
          subText: v?.title ? `▶ ${v.title}` : null,
        });
      }
    })(),
  ]);

  return items.sort((a, b) => {
    const [ra, ta] = urgencyRank(a);
    const [rb, tb] = urgencyRank(b);
    return ra !== rb ? ra - rb : ta - tb;
  });
}

export { kstTodayStartIso, bucketByKstDay, type DayCount } from "@/lib/weekChart/bucket";

export type TodayReplied = { total: number } & Partial<Record<InboxPlatform, number>>;

/**
 * v1.05 「오늘 답한 건수」 — 한국 시간 오늘 0시 이후 게시·발송(status=posted, replied_at)된 본인 항목 수.
 * 건너뛴 항목은 처리 시각이 기록되지 않아 세지 않는다. 권한 있는 플랫폼만.
 */
export async function loadTodayReplied(userId: string, access: InboxAccess): Promise<TodayReplied> {
  const admin = createAdminClient();
  const since = kstTodayStartIso();
  const targets: [InboxPlatform, "ig_comments" | "dm_messages" | "th_comments" | "ytreply_comments"][] = [
    ["ig_comment", "ig_comments"],
    ["ig_dm", "dm_messages"],
    ["threads", "th_comments"],
    ["youtube", "ytreply_comments"],
  ];
  const result: TodayReplied = { total: 0 };
  await Promise.all(
    targets
      .filter(([p]) => access[PLATFORM_SOURCE[p]])
      .map(async ([p, table]) => {
        const { count } = await admin
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "posted")
          .gte("replied_at", since);
        result[p] = count ?? 0;
        result.total += count ?? 0;
      }),
  );
  return result;
}


const REPLY_TABLE: Record<InboxPlatform, "ig_comments" | "dm_messages" | "th_comments" | "ytreply_comments"> = {
  ig_comment: "ig_comments",
  ig_dm: "dm_messages",
  threads: "th_comments",
  youtube: "ytreply_comments",
};
const ALL_PLATFORMS = Object.keys(REPLY_TABLE) as InboxPlatform[];

/**
 * v1.06 「최근 7일 응대」 — 한국 시간 6일 전 0시 이후 게시·발송(status=posted)된 본인 항목의 처리 시각을 모아 날짜별로 센다.
 * 「오늘 답함」과 같은 기준(권한 있는 플랫폼, 건너뛰기 제외). 표마다 최대 5,000건.
 * v1.07: 플랫폼 이름을 묶음(series)으로 넘겨 막대를 플랫폼별 색으로 쌓는다.
 */
export async function loadWeekReplied(userId: string, access: InboxAccess): Promise<DayCount[]> {
  const admin = createAdminClient();
  const now = Date.now();
  const since = weekStartIso(now);
  const lists = await Promise.all(
    ALL_PLATFORMS.filter((p) => access[PLATFORM_SOURCE[p]]).map(async (p) => {
      const { data } = await admin
        .from(REPLY_TABLE[p])
        .select("replied_at")
        .eq("user_id", userId)
        .eq("status", "posted")
        .gte("replied_at", since)
        .limit(5000);
      return (data ?? []).filter((r) => !!r.replied_at).map((r) => ({ at: r.replied_at as string, series: p }));
    }),
  );
  return bucketByKstDay(lists.flat(), now);
}

export type RepliedItem = {
  platform: InboxPlatform;
  id: string;
  authorLabel: string;
  /** v1.08 상대가 남긴 원래 댓글·메시지 앞부분 */
  comment: string;
  /** 실제로 게시·발송한 답장 앞부분 */
  reply: string;
  at: string;
  sourceHref: string;
};

const DAY_LIST_LIMIT = 50;
const REPLY_PREVIEW = 80;

/**
 * v1.07 그래프 막대를 눌렀을 때(v1.08: 상대 원래 댓글·메시지 앞부분도) — 한국 시간 그날 게시·발송한 본인 항목(권한 있는 플랫폼, 플랫폼마다 최근 50건).
 * 날짜 형식이 아니거나 최근 7일 밖이면 빈 목록.
 */
export async function loadDayReplied(userId: string, access: InboxAccess, dayKey: string): Promise<RepliedItem[]> {
  const range = kstDayRange(dayKey);
  if (!range || range.from < weekStartIso() || range.from > kstTodayStartIso()) return [];
  const admin = createAdminClient();
  const cut = (t: string | null) => {
    const s = (t ?? "").replace(/\s+/g, " ").trim();
    return s.length > REPLY_PREVIEW ? `${s.slice(0, REPLY_PREVIEW)}…` : s;
  };
  const day = (table: (typeof REPLY_TABLE)[InboxPlatform], cols: string) =>
    admin
      .from(table)
      .select(cols)
      .eq("user_id", userId)
      .eq("status", "posted")
      .gte("replied_at", range.from)
      .lt("replied_at", range.to)
      .order("replied_at", { ascending: false })
      .limit(DAY_LIST_LIMIT);
  const items: RepliedItem[] = [];

  await Promise.all([
    (async () => {
      if (!access.instagram) return;
      const { data } = await day("ig_comments", "id, media_id, author_username, comment_text, generated_reply, replied_at");
      for (const r of (data ?? []) as unknown as { id: string; media_id: string; author_username: string | null; comment_text: string | null; generated_reply: string | null; replied_at: string }[]) {
        items.push({ platform: "ig_comment", id: r.id, authorLabel: r.author_username ? `@${r.author_username}` : "익명", comment: cut(r.comment_text), reply: cut(r.generated_reply), at: r.replied_at, sourceHref: `${SOURCE_PROGRAMS.instagram.url}/comments#media-${r.media_id}` });
      }
    })(),
    (async () => {
      if (!access.instagram) return;
      const { data } = await day("dm_messages", "id, conversation_id, message_text, generated_reply, replied_at");
      const rows = (data ?? []) as unknown as { id: string; conversation_id: string; message_text: string | null; generated_reply: string | null; replied_at: string }[];
      if (!rows.length) return;
      const ids = Array.from(new Set(rows.map((r) => r.conversation_id)));
      const { data: convs } = await admin.from("dm_conversations").select("id, customer_username").eq("user_id", userId).in("id", ids);
      const byId = new Map((convs ?? []).map((c) => [c.id, c.customer_username as string | null]));
      for (const r of rows) {
        const name = byId.get(r.conversation_id);
        items.push({ platform: "ig_dm", id: r.id, authorLabel: name ? `@${name}` : "고객", comment: cut(r.message_text), reply: cut(r.generated_reply), at: r.replied_at, sourceHref: `${SOURCE_PROGRAMS.instagram.url}/dm/conversations#conv-${r.conversation_id}` });
      }
    })(),
    (async () => {
      if (!access.threads) return;
      const { data } = await day("th_comments", "id, post_id, author_username, comment_text, generated_reply, replied_at");
      for (const r of (data ?? []) as unknown as { id: string; post_id: string; author_username: string | null; comment_text: string | null; generated_reply: string | null; replied_at: string }[]) {
        items.push({ platform: "threads", id: r.id, authorLabel: r.author_username ? `@${r.author_username}` : "익명", comment: cut(r.comment_text), reply: cut(r.generated_reply), at: r.replied_at, sourceHref: `${SOURCE_PROGRAMS.threads.url}/comments#post-${r.post_id}` });
      }
    })(),
    (async () => {
      if (!access.youtube) return;
      const { data } = await day("ytreply_comments", "id, video_id, author_display_name, comment_text, generated_reply, replied_at");
      for (const r of (data ?? []) as unknown as { id: string; video_id: string; author_display_name: string | null; comment_text: string | null; generated_reply: string | null; replied_at: string }[]) {
        items.push({ platform: "youtube", id: r.id, authorLabel: r.author_display_name ?? "익명", comment: cut(r.comment_text), reply: cut(r.generated_reply), at: r.replied_at, sourceHref: `${SOURCE_PROGRAMS.youtube.url}/comments#video-${r.video_id}` });
      }
    })(),
  ]);

  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
