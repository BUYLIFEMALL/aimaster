import "server-only";
import { wingRequest } from "@/lib/coupang/client";
import type { WingKeys } from "@/lib/coupang/keys";
import { blockedOrderIds, normalizeReturns, returnsPath, returnsQuery, type ReturnRequest } from "@/lib/coupang/returns";

// 송장 등록 전 안전 점검(플랜 A3). 명세: 「발송 전에 출고중지요청을 반드시 확인」, 상품준비중 단계 반품 접수는 RU·UC 모두 확인.
// 최근 31일(한국 날짜) 출고중지요청·반품접수 가운데 아직 처리 안 된 주문번호를 모은다. 조회가 실패하면 throw — 호출부는 등록을 멈춘다.
const MAX_PAGES = 5;
const kstDay = (back: number) => new Date(Date.now() + 9 * 3_600_000 - back * 86_400_000).toISOString().slice(0, 10);

export async function unresolvedStopOrders(keys: WingKeys): Promise<Set<number>> {
  const from = kstDay(30);
  const to = kstDay(0);
  const all: ReturnRequest[] = [];
  for (const view of ["RU", "UC"]) {
    let token = "";
    for (let page = 0; page < MAX_PAGES; page++) {
      const r = await wingRequest(keys, "GET", returnsPath(keys.vendorId), { query: returnsQuery({ from, to, view, nextToken: token || undefined }) });
      const { requests, nextToken } = normalizeReturns(r.data);
      all.push(...requests);
      if (!nextToken) break;
      token = nextToken;
    }
  }
  return blockedOrderIds(all);
}
