import type { SupabaseClient } from "@supabase/supabase-js";

// 「📅 내 예약 현황」(2026-10-20) — 9개 프로그램의 예약 게시(+ 아래 정기 자동 실행 7개)를 회원 한 사람 기준으로 모아 본다(보기 전용).
// 각 프로그램 예약 표를 서버(서비스 키)에서 읽되 반드시 user_id = 로그인한 회원으로만 거른다(회원 격리 최상위 규칙).
// 취소는 각 프로그램에서 한다(그림 파일 정리 등 프로그램별 처리가 있음) — 여기서는 「○○에서 보기」 링크만.
// 새 프로그램이 같은 방식(status='scheduled' + scheduled_at)으로 예약을 만들면 SOURCES에 한 줄 추가한다. 플랜 docs/PLAN_20261020_MEMBER_SCHEDULES.md

export type SnsPlatform = "instagram" | "threads" | "naver_blog";

type Source = {
  slug: string; // programs.slug — 이름·주소는 DB에서
  table: string;
  platform: SnsPlatform;
  textCols: string[]; // 앞에서부터 처음 비어 있지 않은 값을 내용으로
  accountCol?: string;
  /** 예약 표시 방식 — 기본은 status='scheduled'. reserved는 is_reserved=true이고 아직 발행·실패 전(네이버 블로그 에이전트) */
  mode?: "status" | "reserved";
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
  // 2026-10-20 추가: 네이버 블로그 에이전트 — 「발행 대기열」 화면과 같은 조건(is_reserved + 예약 시각, 발행·실패 전)
  { slug: "naver-blog-agent", table: "nba_posts", platform: "naver_blog", textCols: ["title", "content"], mode: "reserved" },
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

export type MemberScheduleSummary = { count: number; next: MemberSchedule | null; conflicts: number; recurring: number };

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
      let q = service.from(src.table).select(cols).eq("user_id", userId).not("scheduled_at", "is", null);
      q = src.mode === "reserved" ? q.eq("is_reserved", true).not("status", "in", "(published,failed)") : q.eq("status", "scheduled");
      const { data, error } = await q.order("scheduled_at", { ascending: true }).limit(PER_SOURCE_LIMIT);
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

/** 다음 게시 = 아직 시각이 안 된 첫 예약(없으면 맨 앞) — 시각이 지난 예약이 「다음」으로 보이지 않게 */
export function nextSchedule(list: MemberSchedule[]): MemberSchedule | null {
  const now = Date.now();
  return list.find((s) => Date.parse(s.scheduledAt) >= now) ?? list[0] ?? null;
}

/** 예약 시각이 지났는데 아직 남아 있는가(게시 처리 대기·확인 필요) */
export function isOverdue(s: MemberSchedule): boolean {
  return Date.parse(s.scheduledAt) < Date.now();
}

export function summarizeSchedules(list: MemberSchedule[], recurring: MemberRecurring[] = []): MemberScheduleSummary {
  return { count: list.length, next: nextSchedule(list), conflicts: list.filter((s) => s.conflict).length, recurring: recurring.filter((r) => r.state === "running").length };
}

/** 올해가 아닌 예약이면 연도도 보여 준다(한국 시간 기준) */
function otherYear(d: Date): boolean {
  const y = (x: Date) => x.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric" });
  return y(d) !== y(new Date());
}

/** 한국 시간 「10/21(화) 19:00」(올해가 아니면 연도 포함) */
export function formatScheduleTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", ...(otherYear(d) ? { year: "numeric" as const } : {}), month: "numeric", day: "numeric", weekday: "short" });
  const time = d.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

/** 날짜 묶음 머리글용 「10월 21일 (화)」(올해가 아니면 「2027년 1월 5일 (화)」) */
export function formatScheduleDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", ...(otherYear(d) ? { year: "numeric" as const } : {}), month: "long", day: "numeric", weekday: "short" });
}

export const PLATFORM_LABEL: Record<SnsPlatform, string> = { instagram: "인스타그램", threads: "쓰레드", naver_blog: "네이버 블로그" };

// ── 정기 자동 실행(2026-10-20) ─────────────────────────────────────────────
// 규칙을 켜 두면 주기마다 도는 프로그램 7개(공용 member-scheduler 사용). 「남은 일」 세기는 각 프로그램
// schedulerConfig.ts의 countRemainingWork와 같은 조건이다 — 그쪽을 바꾸면 여기도 맞춘다.
type Svc = SupabaseClient;
const countActive = (table: string, extra?: [string, unknown]) => async (svc: Svc, uid: string) => {
  let q = svc.from(table).select("id", { count: "exact", head: true }).eq("user_id", uid).eq("is_active", true);
  if (extra) q = q.eq(extra[0], extra[1]);
  const { count } = await q;
  return count ?? 0;
};
type Recurring = { slug: string; schedulerTable: string; workLabel: string; count: (svc: Svc, uid: string) => Promise<number> };
const RECURRING: Recurring[] = [
  { slug: "booking-reminder", schedulerTable: "booking_member_scheduler", workLabel: "켜진 리마인드 규칙", count: countActive("booking_reminder_rules") },
  { slug: "crm-google-form", schedulerTable: "crm_member_scheduler", workLabel: "켜진 후속 연락 규칙", count: countActive("crm_followup_rules") },
  { slug: "kakao-auto-posting", schedulerTable: "kakao_member_scheduler", workLabel: "예약을 켠 주제", count: countActive("kakao_topics", ["schedule_enabled", true]) },
  { slug: "naver-cafe-poster", schedulerTable: "ncafe_member_scheduler", workLabel: "예약을 켠 글감 출처", count: countActive("ncafe_scheduled_sources", ["schedule_enabled", true]) },
  {
    slug: "stepmail", schedulerTable: "stepmail_member_scheduler", workLabel: "보낼 차례가 남은 캠페인",
    count: async (svc, uid) => {
      const { data } = await svc.from("stepmail_campaigns").select("recurrence, last_run_at").eq("user_id", uid).eq("is_active", true);
      return ((data ?? []) as { recurrence: string; last_run_at: string | null }[]).filter((c) => !(c.recurrence === "once" && c.last_run_at)).length;
    },
  },
  {
    slug: "trending-product-finder", schedulerTable: "trend_member_scheduler", workLabel: "켜진 관심 목록·알림 상품",
    count: async (svc, uid) => {
      const [{ count: a }, { count: b }] = await Promise.all([
        svc.from("trend_watchlist").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("is_active", true),
        svc.from("sourcing_saved_products").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("alert_enabled", true),
      ]);
      return (a ?? 0) + (b ?? 0);
    },
  },
  {
    slug: "youtube-auto-reply", schedulerTable: "ytreply_member_scheduler", workLabel: "댓글 감시 켜짐",
    count: async (svc, uid) => {
      const { count } = await svc.from("ytreply_settings").select("user_id", { count: "exact", head: true }).eq("user_id", uid).eq("monitoring_enabled", true);
      return count ?? 0;
    },
  },
];

export type MemberRecurring = {
  programSlug: string;
  programName: string;
  programUrl: string | null;
  workLabel: string;
  work: number;
  state: "running" | "paused";
  modeLabel: string;
};

/** 로그인한 회원 본인의 정기 자동 실행 — 켜진 일이 있거나 일시정지한 프로그램만 */
export async function getMemberRecurring(service: SupabaseClient, userId: string): Promise<MemberRecurring[]> {
  const { data: programs } = await service.from("programs").select("slug, name, app_url").in("slug", RECURRING.map((r) => r.slug));
  const info = new Map((programs ?? []).map((p) => [p.slug as string, { name: p.name as string, url: (p.app_url as string | null) ?? null }]));
  const rows = await Promise.all(
    RECURRING.map(async (r): Promise<MemberRecurring | null> => {
      try {
        const [work, { data: sched }] = await Promise.all([
          r.count(service, userId),
          service.from(r.schedulerTable).select("mode, paused").eq("user_id", userId).maybeSingle(),
        ]);
        const paused = Boolean(sched?.paused);
        if (work === 0 && !paused) return null;
        const meta = info.get(r.slug);
        return {
          programSlug: r.slug,
          programName: meta?.name ?? r.slug,
          programUrl: meta?.url ?? null,
          workLabel: r.workLabel,
          work,
          state: paused ? "paused" : "running",
          modeLabel: sched?.mode === "cronjob" ? "내 cron-job.org" : "AIMaster 기본",
        };
      } catch {
        return null;
      }
    }),
  );
  return rows.filter((x): x is MemberRecurring => x !== null);
}
