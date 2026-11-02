// 요금제는 기간 짧은 순으로 보여 준다. DB sort_order는 프로그램마다 제각각이라(2026-11-02 확인) 기간을 먼저 보고, 같은 기간이면 sort_order를 따른다.
const PERIOD_ORDER = ["monthly", "bimonthly", "quarterly", "biannual", "annual", "lifetime"];

export function sortPlansByPeriod<T extends { billing_type: string; sort_order?: number | null }>(plans: T[]): T[] {
  const rank = (plan: T) => {
    const index = PERIOD_ORDER.indexOf(plan.billing_type);
    return index === -1 ? PERIOD_ORDER.length : index;
  };
  return [...plans].sort((a, b) => rank(a) - rank(b) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
}
