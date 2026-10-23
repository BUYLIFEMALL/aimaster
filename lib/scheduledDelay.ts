// 예약 게시 지연 점검 (2026-10-18): 예약 시각이 지났는데도 아직 '예약' 상태인 글을 프로그램별로 센다.
// 실행 장치가 빠지거나(INSTA v1.24 이전) 주기가 길어진(Threads v1.18 이전) 문제를 관리자가 바로 알게 하려는 목적.
// 글 내용·회원 정보는 다루지 않고 건수와 가장 오래 밀린 예약 시각만 본다.
// 플랜: docs/PLAN_20261018_SCHEDULED_DISPATCH_MONITOR.md

/** 이 시간(분)보다 더 밀리면 지연으로 본다. 실행 주기(최대 5분)보다 넉넉하게. */
export const DELAY_THRESHOLD_MINUTES = 10;

/** 글마다 예약 시각(scheduled_at)과 상태(status='scheduled')를 가진 예약 게시 테이블 */
export const SCHEDULED_SOURCES = [
  { program: "Threads 포스팅 자동화", slug: "auto-threads-posting", table: "posts" },
  { program: "INSTA 포스팅 자동화", slug: "auto-instagram-posting", table: "insta_posts" },
  { program: "Threads 콘텐츠 운영 자동화", slug: "threads-content-ops", table: "tco_posts" },
  { program: "Threads 쇼핑제휴 자동화", slug: "threads-affiliate-poster", table: "tap_posts" },
] as const;

export type DelayCount = {
  program: string;
  slug: string;
  /** 지연된 글 수. 조회에 실패하면 null */
  count: number | null;
  /** 가장 오래 밀린 예약 시각(ISO) */
  oldest: string | null;
  error?: string;
};

export type DelaySummary = {
  checkedAt: string;
  thresholdMinutes: number;
  delayed: DelayCount[];
  failed: DelayCount[];
  totalDelayed: number;
};

/** 기준 시각: 지금보다 threshold분 이전 */
export function delayCutoff(now: Date, thresholdMinutes = DELAY_THRESHOLD_MINUTES): string {
  return new Date(now.getTime() - thresholdMinutes * 60_000).toISOString();
}

/** 프로그램별 조회 결과를 알림용 요약으로 정리한다. 지연 0건이면 totalDelayed=0(메일을 보내지 않음). */
export function summarizeDelays(counts: DelayCount[], now: Date, thresholdMinutes = DELAY_THRESHOLD_MINUTES): DelaySummary {
  const delayed = counts.filter((c) => (c.count ?? 0) > 0);
  const failed = counts.filter((c) => c.count === null);
  return {
    checkedAt: now.toISOString(),
    thresholdMinutes,
    delayed,
    failed,
    totalDelayed: delayed.reduce((sum, c) => sum + (c.count ?? 0), 0),
  };
}

type CountQuery = {
  from: (table: string) => {
    select: (cols: string, opts?: { count?: "exact"; head?: boolean }) => {
      eq: (col: string, val: string) => {
        lte: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => {
            limit: (n: number) => PromiseLike<{ data: { scheduled_at: string }[] | null; count: number | null; error: { message: string } | null }>;
          };
        };
      };
    };
  };
};

/** 서비스 키 클라이언트로 각 테이블의 지연 글 수를 센다. 한 테이블이 실패해도 나머지는 계속한다. */
export async function countDelays(db: CountQuery, now: Date, thresholdMinutes = DELAY_THRESHOLD_MINUTES): Promise<DelayCount[]> {
  const cutoff = delayCutoff(now, thresholdMinutes);
  const results: DelayCount[] = [];
  for (const src of SCHEDULED_SOURCES) {
    try {
      const { data, count, error } = await db
        .from(src.table)
        .select("scheduled_at", { count: "exact" })
        .eq("status", "scheduled")
        .lte("scheduled_at", cutoff)
        .order("scheduled_at", { ascending: true })
        .limit(1);
      if (error) results.push({ program: src.program, slug: src.slug, count: null, oldest: null, error: error.message });
      else results.push({ program: src.program, slug: src.slug, count: count ?? 0, oldest: data?.[0]?.scheduled_at ?? null });
    } catch (err) {
      results.push({ program: src.program, slug: src.slug, count: null, oldest: null, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}
