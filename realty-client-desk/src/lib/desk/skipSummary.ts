// L-2(2026-11-19, docs/PLAN_20261119_DESK_CANDIDATES.md) — 맞는 고객 중 보낼 수 없는 사람을 사유별로 센다(화면 계산만, 저장하지 않음).
// 사유 글은 adEligibility(adRules.ts)가 돌려주는 그대로 쓰고, 발송 기록이 있는 고객은 상태(보냄·보내는 중·실패)와 상관없이 중립 표현 「발송 기록 있음」으로 따로 센다(2026-11-19 보완 msg_1884123d9d90 — 발송·차단 판정은 그대로). 시험 tests/skipSummary.test.mjs.

export interface SkipCandidate { ok: boolean; note: string; sent: boolean }

/** 「수신거부 2 · 광고 수신 미동의 1 · 발송 기록 있음 3」 모양(많은 순, 같으면 이름 순). 빠진 사람이 없으면 빈 글 */
export function skipSummary(list: readonly SkipCandidate[]): string {
  const n = new Map<string, number>();
  for (const c of list) {
    const key = c.sent ? "발송 기록 있음" : !c.ok ? (c.note || "보낼 수 없음") : null;
    if (key) n.set(key, (n.get(key) ?? 0) + 1);
  }
  return [...n.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .map(([k, v]) => `${k} ${v}`)
    .join(" · ");
}
