// 여러 원고를 순서대로 네이버 예약 발행할 때의 시각 배정.
// 네이버 예약은 10분 단위라 확장도 10분 단위로 올림한다(extension/editor.js). 같은 기준으로 맞춘다.

export const SCHEDULE_STEP_MINUTES = 10;
export const MIN_LEAD_MINUTES = 20; // 확장이 작업을 받아 입력하는 시간을 남긴다.
export const SCHEDULE_INTERVAL_OPTIONS = [10, 20, 30, 60, 120, 180, 360] as const;

const STEP_MS = SCHEDULE_STEP_MINUTES * 60_000;

export function roundUpToStep(time: number): number {
  return Math.ceil(time / STEP_MS) * STEP_MS;
}

/** 시작 시각부터 간격(분)마다 count개의 예약 시각(ISO)을 만든다. 조건이 맞지 않으면 안내 오류를 던진다. */
export function buildScheduleSlots(startAt: string, intervalMinutes: number, count: number, now: number = Date.now()): string[] {
  const start = new Date(startAt).getTime();
  if (!Number.isFinite(start)) throw new Error("예약 시작 시각을 선택해 주세요.");
  if (!Number.isInteger(intervalMinutes) || intervalMinutes < SCHEDULE_STEP_MINUTES || intervalMinutes % SCHEDULE_STEP_MINUTES !== 0) {
    throw new Error(`예약 간격은 ${SCHEDULE_STEP_MINUTES}분 단위로 선택해 주세요.`);
  }
  if (!Number.isInteger(count) || count < 1) throw new Error("예약할 원고를 선택해 주세요.");
  const first = roundUpToStep(start);
  if (first < now + MIN_LEAD_MINUTES * 60_000) throw new Error(`예약 시작 시각은 지금부터 ${MIN_LEAD_MINUTES}분 이후로 정해 주세요.`);
  return Array.from({ length: count }, (_, index) => new Date(first + index * intervalMinutes * 60_000).toISOString());
}

/** 저장 요청의 예약 값을 검사한다. 예약을 켜면 미래의 10분 단위 시각이어야 한다. */
export function validateReservation(isReserved: unknown, scheduledAt: unknown, now: number = Date.now()): string | null {
  if (isReserved === undefined && scheduledAt === undefined) return null;
  if (typeof isReserved !== "boolean") return "예약 여부 형식을 확인해 주세요.";
  if (!isReserved) return scheduledAt === undefined || scheduledAt === null ? null : "예약을 끄면 예약 시각을 비워 주세요.";
  const time = typeof scheduledAt === "string" ? new Date(scheduledAt).getTime() : NaN;
  if (!Number.isFinite(time)) return "예약 시각을 확인해 주세요.";
  if (time % STEP_MS !== 0) return `예약 시각은 ${SCHEDULE_STEP_MINUTES}분 단위여야 합니다.`;
  if (time < now + MIN_LEAD_MINUTES * 60_000) return `예약 시각은 지금부터 ${MIN_LEAD_MINUTES}분 이후여야 합니다.`;
  return null;
}
