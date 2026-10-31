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
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const summaryHtml = (text: string) => `<div style="font-family:sans-serif;font-size:14px;line-height:1.7">${text.split("\n").map(escapeHtml).join("<br>")}</div>`;

export const CLEANUP_DAYS = 30;
export const cleanupBefore = (nowMs: number) => new Date(nowMs - CLEANUP_DAYS * 86_400_000).toISOString();
export const kstDate = (nowMs = Date.now()) => new Date(nowMs + 9 * 3_600_000).toISOString().slice(0, 10);
export const cleanHour = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : DEFAULT_ALERT_HOUR;
};

const shown = (c: Count) => ("error" in c ? "확인 실패" : `${c.count}${c.more ? "+" : ""}건`);
const urgent = (c: Count) => ("error" in c ? false : c.count > 0);

export function summaryMessage(c: TodayCounts, nowMs = Date.now(), keyNotice = ""): string {
  const failed = [c.accept, c.instruct, c.stopRequests, c.returnsReceived, c.inquiries, c.exchanges].some((x) => "error" in x);
  return [
    `🛒 쿠팡 아침 요약 (${kstDate(nowMs)})`,
    ...(keyNotice ? [`🔑 ${keyNotice}`] : []),
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
