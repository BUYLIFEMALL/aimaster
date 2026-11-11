// D30 정기 주문 — 주기·다음 주문일 계산·입력 검사(node --test 대상, DB 없음). DB 함수(0050)와 같은 규칙:
//   매주/○주마다: 시작일 이후 첫 그 요일 → 이후 7×○일씩 / 매달: 시작일 이후 첫 그 날짜(말일보다 크면 말일) → 이후 다음 달 같은 날(말일 보정)
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

export type RecurringKind = "weekly" | "monthly";
export type RecurringPay = "bank" | "credit";
export type RecurringStatus = "active" | "paused" | "cancelled";
export type Schedule = { kind: RecurringKind; weekday: number | null; every_weeks: number; month_day: number | null };

export const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];
export const RECURRING_STATUS_LABEL: Record<RecurringStatus, string> = { active: "진행 중", paused: "일시정지", cancelled: "해지" };
export const RECURRING_PAY_LABEL: Record<RecurringPay, string> = { bank: "무통장 입금", credit: "외상" };
export const MAX_ACTIVE_PER_CUSTOMER = 20;
export const RUN_HOUR_KST = 8; // 이 시각(한국) 이후 첫 실행 때 그날 주문을 만든다

const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); // m: 0~11
const addDays = (s: string, n: number) => {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
};

export const todayKst = (now = Date.now()) => new Date(now + 9 * 3600_000).toISOString().slice(0, 10);

/** 시작일(포함) 이후 첫 주문일 */
export function firstDate(s: Schedule, start: string): string {
  if (s.kind === "weekly") {
    const dow = toDate(start).getUTCDay();
    return addDays(start, ((s.weekday ?? 0) - dow + 7) % 7);
  }
  const d = toDate(start);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = Math.min(s.month_day ?? 1, lastDay(y, m));
  if (d.getUTCDate() <= day) return fmt(new Date(Date.UTC(y, m, day)));
  const ny = m === 11 ? y + 1 : y;
  const nm = (m + 1) % 12;
  return fmt(new Date(Date.UTC(ny, nm, Math.min(s.month_day ?? 1, lastDay(ny, nm)))));
}

/** 이번 주문일 다음 주문일 */
export function nextDate(s: Schedule, from: string): string {
  if (s.kind === "weekly") return addDays(from, 7 * s.every_weeks);
  const d = toDate(from);
  const ny = d.getUTCMonth() === 11 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
  const nm = (d.getUTCMonth() + 1) % 12;
  return fmt(new Date(Date.UTC(ny, nm, Math.min(s.month_day ?? 1, lastDay(ny, nm)))));
}

/** 앞으로 n번의 주문일(화면 미리보기) */
export function upcoming(s: Schedule, first: string, n = 3): string[] {
  const out = [first];
  while (out.length < n) out.push(nextDate(s, out[out.length - 1]));
  return out;
}

export function scheduleLabel(s: Schedule): string {
  if (s.kind === "monthly") return s.month_day && s.month_day >= 29 ? `매달 ${s.month_day}일(없는 달은 말일)` : `매달 ${s.month_day}일`;
  const day = `${WEEKDAY_LABEL[s.weekday ?? 0]}요일`;
  return s.every_weeks === 1 ? `매주 ${day}` : `${s.every_weeks}주마다 ${day}`;
}

/** 손님 입력 검사 → 저장할 주기 */
export function parseSchedule(input: { kind: unknown; weekday: unknown; every_weeks: unknown; month_day: unknown; start: unknown }, today: string):
  | { ok: true; value: Schedule; start: string }
  | { ok: false; error: string } {
  const kind = input.kind === "monthly" ? "monthly" : input.kind === "weekly" ? "weekly" : null;
  if (!kind) return { ok: false, error: "주기를 골라 주세요(매주·매달)." };
  const start = String(input.start ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || Number.isNaN(toDate(start).getTime())) return { ok: false, error: "시작일을 골라 주세요." };
  if (start < today) return { ok: false, error: "시작일은 오늘 이후로 골라 주세요." };
  if (start > addDays(today, 90)) return { ok: false, error: "시작일은 90일 안으로 골라 주세요." };
  if (kind === "weekly") {
    const weekday = Number(input.weekday);
    const every = Number(input.every_weeks ?? 1);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { ok: false, error: "요일을 골라 주세요." };
    if (!Number.isInteger(every) || every < 1 || every > 4) return { ok: false, error: "주기는 1~4주로 골라 주세요." };
    return { ok: true, value: { kind, weekday, every_weeks: every, month_day: null }, start };
  }
  const day = Number(input.month_day);
  if (!Number.isInteger(day) || day < 1 || day > 31) return { ok: false, error: "날짜는 1~31일로 골라 주세요." };
  return { ok: true, value: { kind, weekday: null, every_weeks: 1, month_day: day }, start };
}
