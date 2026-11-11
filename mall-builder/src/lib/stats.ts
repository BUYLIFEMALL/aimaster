// 통계(D14) — 기간 계산(한국 시간)·막대 비율·이름표. DB 함수 mall_builder_stats가 숫자를 만든다
export type PeriodKey = "today" | "7d" | "30d" | "month" | "custom";
export const PERIOD_LABEL: Record<Exclude<PeriodKey, "custom">, string> = { today: "오늘", "7d": "최근 7일", "30d": "최근 30일", month: "이번 달" };
export const PAY_METHOD_LABEL: Record<string, string> = { card: "카드", credit: "외상(후불)", bank: "무통장" };
export const MAX_RANGE_DAYS = 400;

export type Stats = {
  summary: { orders: number; sales: number; avg_order: number; cancelled_count: number; cancelled_amount: number; pending_count: number; all_orders: number; new_customers: number; total_customers: number; buyers: number; guest_orders?: number };
  daily: { day: string; orders: number; sales: number }[];
  by_status: { status: string; count: number }[];
  pay_method: { method: string; count: number; amount: number }[];
  top_products: { product_id: string | null; name: string; qty: number; amount: number }[];
  cart_top: { product_id: string; name: string; qty: number; users: number }[];
};

const KST = 9 * 60 * 60 * 1000;

/** 한국 날짜(YYYY-MM-DD)의 0시를 UTC 시각으로 */
export function kstDayStart(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - KST);
}

/** 어떤 시각이 한국 시간으로 몇 일인지(YYYY-MM-DD) */
export function kstDate(at: Date): string {
  return new Date(at.getTime() + KST).toISOString().slice(0, 10);
}

function addDays(ymd: string, n: number): string {
  return kstDate(new Date(kstDayStart(ymd).getTime() + n * 86_400_000));
}

export type Period = { key: PeriodKey; fromDay: string; toDay: string; from: Date; to: Date };

/**
 * 기간 → 한국 날짜 범위(fromDay~toDay, 끝 날짜 포함)와 DB에 넘길 시각(from 포함, to 미포함).
 * custom은 fromDay·toDay를 받는다(없거나 틀리면 30일). 끝이 시작보다 앞이면 바꿔 끼우고, 400일을 넘으면 시작을 당긴다.
 */
export function periodRange(key: string | undefined, now: Date, fromDay?: string, toDay?: string): Period {
  const today = kstDate(now);
  let k: PeriodKey = (["today", "7d", "30d", "month", "custom"] as const).includes(key as PeriodKey) ? (key as PeriodKey) : "30d";
  let a: string;
  let b: string = today;
  if (k === "today") a = today;
  else if (k === "7d") a = addDays(today, -6);
  else if (k === "month") a = today.slice(0, 8) + "01";
  else if (k === "custom" && isYmd(fromDay) && isYmd(toDay)) {
    a = fromDay!;
    b = toDay!;
    if (a > b) [a, b] = [b, a];
    const days = (kstDayStart(b).getTime() - kstDayStart(a).getTime()) / 86_400_000 + 1;
    if (days > MAX_RANGE_DAYS) a = addDays(b, -(MAX_RANGE_DAYS - 1));
  } else {
    k = "30d";
    a = addDays(today, -29);
  }
  return { key: k, fromDay: a, toDay: b, from: kstDayStart(a), to: kstDayStart(addDays(b, 1)) };
}

export function isYmd(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(kstDayStart(s).getTime());
}

/** 막대 길이(%) — 최댓값이 100 */
export function barPct(value: number, max: number): number {
  if (!max || max <= 0 || value <= 0) return 0;
  return Math.max(2, Math.round((value / max) * 100));
}

/** 빈 통계(함수가 아무것도 못 돌려줬을 때) */
export function emptyStats(): Stats {
  return {
    summary: { orders: 0, sales: 0, avg_order: 0, cancelled_count: 0, cancelled_amount: 0, pending_count: 0, all_orders: 0, new_customers: 0, total_customers: 0, buyers: 0 },
    daily: [], by_status: [], pay_method: [], top_products: [], cart_top: [],
  };
}
