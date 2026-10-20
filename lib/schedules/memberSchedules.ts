import type { SupabaseClient } from "@supabase/supabase-js";

// 「📅 내 예약 현황」(2026-10-20) — 8개 프로그램의 SNS 예약 게시를 회원 한 사람 기준으로 모아 본다(보기 전용).
// 각 프로그램 예약 표를 서버(서비스 키)에서 읽되 반드시 user_id = 로그인한 회원으로만 거른다(회원 격리 최상위 규칙).
// 취소는 각 프로그램에서 한다(그림 파일 정리 등 프로그램별 처리가 있음) — 여기서는 「○○에서 보기」 링크만.
// 새 프로그램이 같은 방식(status='scheduled' + scheduled_at)으로 예약을 만들면 SOURCES에 한 줄 추가한다. 플랜 docs/PLAN_20261020_MEMBER_SCHEDULES.md

export type SnsPlatform = "instagram" | "threads";

type Source = {
  slug: string; // programs.slug — 이름·주소는 DB에서
  table: string;
  platform: SnsPlatform;
  textCols: string[]; // 앞에서부터 처음 비어 있지 않은 값을 내용으로
  accountCol?: string;
};

const SOURCES: Source[] = [
  { slug: "auto-instagram-posting", table: "insta_posts", platform: "instagram", textCols: ["caption"] },
  { slug: "cardnews-studio", table: "cns_insta_posts", platform: "instagram", textCols: ["title", "caption"], accountCol: "ig_username" },
  { slug: "ai-influencer-studio", table: "aif_insta_posts", platform: "instagram", textCols: ["title", "caption"], accountCol: "ig_username" },
  { slug: "ai-webtoon-studio", table: "wts_insta_posts", platform: "instagram", textCols: ["title", "caption"], accountCol: "ig_username" },
  { slug: "four-cut-comics", table: "fcc_insta_posts", platform: "instagram", textCols: ["title", "caption"], accountCol: "ig_username" },
  { slug: "auto-threads-posting", table: "posts", platform: "threads", textCols: ["content"] },
  { slug: "threads-affiliate-poster", table: "tap_posts", platform: "threads", textCols: ["content"] },
  { slug: "threads-content-ops", table: "tco_posts", platform: "threads", textCols: ["body"] },
];

/** 같은 SNS에 이 시간 안으로 예약이 겹치면 경고 */
const CONFLICT_MS = 30 * 60 * 1000;
const PER_SOURCE_LIMIT = 100;

export type MemberSchedule = {
  key: string;
  programSlug: string;
  programName: string;
  programUrl: string | null;
  platform: SnsPlatform;
  scheduledAt: string;
  text: string;
  account: string | null;
  conflict: boolean;
};

export type MemberScheduleSummary = { count: number; next: MemberSchedule | null; conflicts: number };

function oneLine(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 80) : "";
}

/** 로그인한 회원 본인의 남은 예약(시각 순). 표 하나가 실패해도 나머지는 보여 준다. */
export async function getMemberSchedules(service: SupabaseClient, userId: string): Promise<MemberSchedule[]> {
  const { data: programs } = await service.from("programs").select("slug, name, app_url").in("slug", SOURCES.map((s) => s.slug));
  const info = new Map((programs ?? []).map((p) => [p.slug as string, { name: p.name as string, url: (p.app_url as string | null) ?? null }]));

  const lists = await Promise.all(
    SOURCES.map(async (src) => {
      const cols = ["id", "scheduled_at", ...src.textCols, ...(src.accountCol ? [src.accountCol] : [])].join(", ");
      const { data, error } = await service
        .from(src.table)
        .select(cols)
        .eq("user_id", userId)
        .eq("status", "scheduled")
        .not("scheduled_at", "is", null)
        .order("scheduled_at", { ascending: true })
        .limit(PER_SOURCE_LIMIT);
      if (error || !data) return [];
      const meta = info.get(src.slug);
      return (data as unknown as Record<string, unknown>[]).map((row): MemberSchedule => ({
        key: `${src.slug}:${row.id as string}`,
        programSlug: src.slug,
        programName: meta?.name ?? src.slug,
        programUrl: meta?.url ?? null,
        platform: src.platform,
        scheduledAt: row.scheduled_at as string,
        text: src.textCols.map((c) => oneLine(row[c])).find(Boolean) || "(내용 없음)",
        account: src.accountCol ? oneLine(row[src.accountCol]) || null : null,
        conflict: false,
      }));
    }),
  );

  const all = lists.flat().sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  // 같은 SNS에 30분 안으로 붙은 예약은 서로 겹침 표시(계정이 둘 다 적혀 있고 다르면 겹침 아님)
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const gap = Date.parse(all[j].scheduledAt) - Date.parse(all[i].scheduledAt);
      if (gap > CONFLICT_MS) break;
      if (all[i].platform !== all[j].platform) continue;
      if (all[i].account && all[j].account && all[i].account !== all[j].account) continue;
      all[i].conflict = true;
      all[j].conflict = true;
    }
  }
  return all;
}

export function summarizeSchedules(list: MemberSchedule[]): MemberScheduleSummary {
  return { count: list.length, next: list[0] ?? null, conflicts: list.filter((s) => s.conflict).length };
}

/** 한국 시간 「10/21(화) 19:00」 */
export function formatScheduleTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short" });
  const time = d.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

/** 날짜 묶음 머리글용 「10월 21일 (화)」 */
export function formatScheduleDay(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" });
}

export const PLATFORM_LABEL: Record<SnsPlatform, string> = { instagram: "인스타그램", threads: "쓰레드" };
