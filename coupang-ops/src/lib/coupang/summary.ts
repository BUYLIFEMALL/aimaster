// 아침 요약 문구·규칙(묶음 6). 외부 호출 없음(tests/summary.test.mjs). 건수만 담고 고객·주문 내용은 담지 않는다.
export type Count = { count: number; more: boolean } | { error: string };
export type TodayCounts = { accept: Count; instruct: Count; stopRequests: Count; returnsReceived: Count; inquiries: Count; exchanges: Count; from: string; to: string };

export const SUMMARY_CALLS_PER_DAY = 7; // 발주서 2 + 반품 2 + 문의 2 + 교환 1
export const DEFAULT_ALERT_HOUR = 8;
export const SITE_ORIGIN = "https://coupang-ops.buylife.xyz";
export const SUMMARY_PATH = "/api/cron/coupang-summary";
export const TOKEN_PREFIX = "cops";

export const ALERT_CHANNELS = ["telegram", "email", "kakao"] as const;
export type AlertChannel = (typeof ALERT_CHANNELS)[number];
export const CHANNEL_LABEL: Record<AlertChannel, string> = { telegram: "텔레그램", email: "이메일", kakao: "카카오톡" };
export const cleanChannels = (raw: unknown): AlertChannel[] => ALERT_CHANNELS.filter((c) => Array.isArray(raw) && raw.includes(c));

export const CLEANUP_DAYS = 30;
export const cleanupBefore = (nowMs: number) => new Date(nowMs - CLEANUP_DAYS * 86_400_000).toISOString();
export const kstDate = (nowMs = Date.now()) => new Date(nowMs + 9 * 3_600_000).toISOString().slice(0, 10);
export const cleanHour = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : DEFAULT_ALERT_HOUR;
};

// R10 수시 알림: 건수가 늘었을 때만 보낸다
export const URGENT_PATH = "/api/cron/coupang-urgent";
export const URGENT_CALLS_PER_RUN = 3; // 출고중지 1 + 문의 2
export const DEFAULT_URGENT_HOURS = [9, 18]; // 2026-10-31 주인님 지시: 기본 오전 9시·오후 6시, 회원이 바꿀 수 있음
export const URGENT_MAX_HOURS = 6;
/** 0~23시 정수만, 중복 없이, 시간순으로, 상한까지 */
export const cleanUrgentHours = (raw: unknown): number[] =>
  [...new Set(Array.isArray(raw) ? raw : [])].filter((h): h is number => Number.isInteger(h) && (h as number) >= 0 && (h as number) <= 23).sort((a, b) => a - b).slice(0, URGENT_MAX_HOURS);
export const hourLabel = (h: number) => (h === 0 ? "밤 12시" : h < 12 ? `오전 ${h}시` : h === 12 ? "낮 12시" : `오후 ${h - 12}시`);
export const urgentRunKey = (nowMs = Date.now()) => new Date(nowMs + 9 * 3_600_000).toISOString().slice(0, 13);
type UrgentCounts = { stop: number | null; inquiries: number | null };

/** 이전보다 늘어난 항목만 담는다. 못 읽은 항목(null)은 비교하지 않는다. 처음 확인이면 0에서 늘어난 것으로 본다 */
export function urgentMessage(prev: UrgentCounts, now: UrgentCounts): string {
  const lines: string[] = [];
  if (now.stop !== null && now.stop > (prev.stop ?? 0)) lines.push(`🚨 출고중지 요청 ${now.stop}건(새로 ${now.stop - (prev.stop ?? 0)}건)`);
  if (now.inquiries !== null && now.inquiries > (prev.inquiries ?? 0)) lines.push(`💬 미답변 문의 ${now.inquiries}건(새로 ${now.inquiries - (prev.inquiries ?? 0)}건)`);
  return lines.length ? ["🛒 쿠팡 새 요청", ...lines, `처리하기: ${SITE_ORIGIN}/home`].join("\n") : "";
}

const shown = (c: Count) => ("error" in c ? "확인 실패" : `${c.count}${c.more ? "+" : ""}건`);
const urgent = (c: Count) => ("error" in c ? false : c.count > 0);

export function summaryMessage(c: TodayCounts, nowMs = Date.now(), keyNotice = "", stockLine = ""): string {
  const failed = [c.accept, c.instruct, c.stopRequests, c.returnsReceived, c.inquiries, c.exchanges].some((x) => "error" in x);
  return [
    `🛒 쿠팡 아침 요약 (${kstDate(nowMs)})`,
    ...(keyNotice ? [`🔑 ${keyNotice}`] : []),
    ...(stockLine ? [stockLine] : []),
    `${urgent(c.stopRequests) ? "🚨" : "▫"} 출고중지 요청 ${shown(c.stopRequests)}`,
    `${urgent(c.inquiries) ? "🚨" : "▫"} 미답변 문의 ${shown(c.inquiries)}`,
    `▫ 결제완료 ${shown(c.accept)}`,
    `▫ 상품준비중 ${shown(c.instruct)}`,
    `▫ 반품 접수 ${shown(c.returnsReceived)}`,
    `▫ 처리 중인 교환 ${shown(c.exchanges)}`,
    ...(failed ? ["일부 항목을 읽지 못했습니다. 프로그램에서 직접 확인해 주세요."] : []),
    `처리하기: ${SITE_ORIGIN}/home`,
  ].join("\n");
}
