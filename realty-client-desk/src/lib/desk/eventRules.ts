// 3단계(2026-11-03): 일정 알림 규칙(순수 함수 — node --test로 시험). 알림은 하루 한 번 아침 8시(한국 시각)에 확인한다.
export const EVENT_KINDS = ["임장", "계약", "중도금", "잔금", "만기", "기타"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** 종류별 기본 「며칠 전 알림」 — 만기는 갱신 상담 때문에 넉넉히 */
export const DEFAULT_NOTIFY_DAYS: Record<EventKind, number> = { 임장: 0, 계약: 1, 중도금: 1, 잔금: 3, 만기: 60, 기타: 1 };

/** 한국 날짜 「YYYY-MM-DD」 */
export function kstDate(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

/** 「YYYY-MM-DD」 + 「HH:MM」(한국 시각) → Date. 읽지 못하면 null */
export function parseKst(day: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const t = /^\d{2}:\d{2}$/.test(time) ? time : "10:00";
  const d = new Date(`${day}T${t}:00+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 오늘(한국 날짜) 알려야 하는 일정인가: 알림일(일정일 − N일) ≤ 오늘, 아직 안 알림, 안 끝남, 일정이 아직 안 지남(오늘 포함) */
export function isDue(e: { event_at: string; notify_days: number; notified_at: string | null; done: boolean }, now = new Date()): boolean {
  if (e.done || e.notified_at) return false;
  const eventDay = kstDate(new Date(e.event_at));
  const today = kstDate(now);
  if (eventDay < today) return false;
  const notifyDay = kstDate(new Date(new Date(`${eventDay}T00:00:00+09:00`).getTime() - e.notify_days * 86_400_000));
  return notifyDay <= today;
}

/** 일정까지 남은 날(한국 날짜 기준, 오늘 = 0) */
export function daysLeft(eventAt: string, now = new Date()): number {
  const a = Date.parse(`${kstDate(new Date(eventAt))}T00:00:00+09:00`);
  const b = Date.parse(`${kstDate(now)}T00:00:00+09:00`);
  return Math.round((a - b) / 86_400_000);
}

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false });
const md = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });

/** 회원 본인에게 보내는 알림 문자(광고 아님) — 일정 여러 개를 한 통으로 */
export function reminderText(events: { kind: string; title: string; event_at: string; client_name?: string | null }[], now = new Date()): string {
  const lines = events
    .slice()
    .sort((a, b) => a.event_at.localeCompare(b.event_at))
    .slice(0, 10)
    .map((e) => {
      const n = daysLeft(e.event_at, now);
      const when = n === 0 ? `오늘 ${hhmm(e.event_at)}` : `${md(e.event_at)} ${hhmm(e.event_at)}(D-${n})`;
      return `· [${e.kind}] ${when} ${e.title}${e.client_name ? ` — ${e.client_name}` : ""}`;
    });
  const more = events.length > 10 ? `\n외 ${events.length - 10}건` : "";
  return `[중개사무소 일정 알림]\n${lines.join("\n")}${more}`;
}
