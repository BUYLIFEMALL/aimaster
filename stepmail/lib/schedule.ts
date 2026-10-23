import "server-only";

/** UTC epoch를 그대로 9시간 밀어서, 이후 getUTC*() 게터를 마치 KST 게터처럼 쓸 수 있게 한다
 * (real_estate_sales의 currentKstHour()와 동일한 트릭). */
export function nowShiftedToKst(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function toKst(date: Date): Date {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

function isSameKstDay(a: Date, b: Date): boolean {
  const ka = toKst(a);
  const kb = toKst(b);
  return ka.getUTCFullYear() === kb.getUTCFullYear() && ka.getUTCMonth() === kb.getUTCMonth() && ka.getUTCDate() === kb.getUTCDate();
}

function kstWeekNumber(date: Date): number {
  // ISO 주차 대신 "년초부터 며칠째/7"로 단순 계산 — 정확한 ISO 주 경계는 필요 없고
  // "이번 주에 이미 돌았는지"만 구분하면 되므로 충분하다.
  const k = toKst(date);
  const start = Date.UTC(k.getUTCFullYear(), 0, 1);
  const diffDays = Math.floor((Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - start) / 86400000);
  return Math.floor(diffDays / 7);
}

export interface CampaignScheduleInput {
  send_hour: number;
  recurrence: "once" | "daily" | "weekly";
  weekly_day: number | null;
  last_run_at: string | null;
  is_active: boolean;
}

/**
 * 이 시간(hourly cron)에 캠페인을 실행해야 하는지 판단한다. 분 단위까지는 맞추지 않는다 —
 * 이 프로젝트의 cron이 매시 정각에 한 번만 깨어나므로(vercel.json), 캠페인의 send_hour와
 * 현재 KST 시각이 같은 시간대이면 그 시간대의 실행으로 취급한다.
 */
export function isCampaignDue(campaign: CampaignScheduleInput, now: Date = new Date()): boolean {
  if (!campaign.is_active) return false;

  const kstNow = toKst(now);
  if (kstNow.getUTCHours() !== campaign.send_hour) return false;

  if (campaign.recurrence === "once") {
    return !campaign.last_run_at;
  }

  if (campaign.recurrence === "daily") {
    if (!campaign.last_run_at) return true;
    return !isSameKstDay(new Date(campaign.last_run_at), now);
  }

  // weekly
  if (campaign.weekly_day == null) return false;
  if (kstNow.getUTCDay() !== campaign.weekly_day) return false;
  if (!campaign.last_run_at) return true;
  return kstWeekNumber(new Date(campaign.last_run_at)) !== kstWeekNumber(now);
}
