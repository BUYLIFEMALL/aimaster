// 고객 → 맞는 내 매물(2026-11-20, RE-EXT-CRM-NEXT-SCOPE). 매물 → 고객 쪽과 같은 규칙(matchReasons)을 그대로 쓴다.
// 화면 계산만 — 저장·발송 없음. 매물 목록은 조회 상한(최근 N건) 안에서만 세므로 「전체 매물 수」로 표시하지 않는다.
// 매칭 규칙은 adRules.matchReasons를 호출한 쪽이 넘긴다(lib 파일끼리 import하지 않는 기존 관례 — node 시험·tsc 모두 확장자 문제 없음).
type Seeker = { deal_side?: string | null; status: string };
export type Matcher<C, L> = (c: C, l: L) => string[] | null;

export type ClientMatchListing = { id: string; status: string };
export type ClientMatch = { count: number; firstId: string | null };

/** 매도·임대, 계약·종료 고객은 매물 안내 대상이 아니다(matchReasons와 같은 기준) — 이런 고객은 줄을 보여 주지 않는다 */
export function isSeekingClient(c: Seeker): boolean {
  if (c.status === "계약" || c.status === "종료") return false;
  return c.deal_side !== "매도" && c.deal_side !== "임대";
}

/**
 * 고객 한 명에게 맞는 「광고 중」 매물 수와 첫 매물 id.
 * listings는 호출한 쪽이 정한 순서(최근 등록순)를 그대로 따르고, 첫 링크는 그 순서의 첫 일치 매물이다.
 */
export function matchListingsForClient<C, L extends ClientMatchListing>(c: C, listings: readonly L[], match: Matcher<C, L>): ClientMatch {
  let count = 0;
  let firstId: string | null = null;
  for (const l of listings) {
    if (l.status !== "광고 중") continue;
    if (!match(c, l)) continue;
    count += 1;
    if (firstId === null) firstId = l.id;
  }
  return { count, firstId };
}

/** 화면 한 줄. 조회가 상한에 닿았으면(limited) 「최근 n건 중」으로 범위를 밝힌다 */
export function clientMatchLabel(m: ClientMatch, scanned: number, limited: boolean): string {
  const scope = limited ? `최근 매물 ${scanned}건 중 ` : "";
  return m.count > 0 ? `🏠 ${scope}맞는 내 매물 ${m.count}건` : `🏠 ${scope}맞는 광고 중 매물 없음`;
}
