import "server-only";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import type { WingKeys } from "@/lib/coupang/keys";
import { normalizeOrderSheets, ordersPath, ordersQuery, readPages } from "@/lib/coupang/orders";
import { exchangeRange, exchangesPath, exchangesQuery, isOpenExchange, normalizeExchanges } from "@/lib/coupang/exchanges";
import { centerListPath, centerQuery, inquiryRange, normalizeCenter, normalizeOnline, onlineListPath, onlineQuery } from "@/lib/coupang/inquiry";
import { blockedOrderIds, normalizeReturns, returnsPath, returnsQuery } from "@/lib/coupang/returns";
import type { Count, TodayCounts } from "@/lib/coupang/summary";

// 「오늘 할 일」과 아침 요약이 함께 쓴다. 최근 31일(한국 날짜) 발주서 수와 미처리 요청 수. 쿠팡 읽기 7번부터, 50건이 넘는 항목은 3쪽(150건)까지 이어 읽고 그래도 넘으면 「150+」.
const kstDay = (back: number) => new Date(Date.now() + 9 * 3_600_000 - back * 86_400_000).toISOString().slice(0, 10);
const wingMsg = (e: unknown) => (e instanceof WingApiError ? e.message : "연결 오류");

export async function readTodayCounts(keys: WingKeys & { userId?: string }): Promise<TodayCounts> {
  const from = kstDay(30);
  const to = kstDay(0);

  const orders = async (status: string): Promise<Count> => {
    try {
      const r = await readPages(async (nextToken) => {
        const p = normalizeOrderSheets((await wingRequest(keys, "GET", ordersPath(keys.vendorId), { query: ordersQuery({ from, to, status, nextToken }) })).data);
        return { items: p.orders, nextToken: p.nextToken };
      });
      return { count: r.items.length, more: !!r.nextToken };
    } catch (e) {
      return { error: wingMsg(e) };
    }
  };
  // 반품·취소 요청은 아직 처리 안 된 것(출고중지요청·반품접수 상태)만 센다
  const pending = async (view: string): Promise<Count> => {
    try {
      const r = await readPages(async (nextToken) => {
        const p = normalizeReturns((await wingRequest(keys, "GET", returnsPath(keys.vendorId), { query: returnsQuery({ from, to, view, nextToken }) })).data);
        return { items: p.requests, nextToken: p.nextToken };
      });
      return { count: blockedOrderIds(r.items).size, more: !!r.nextToken };
    } catch (e) {
      return { error: wingMsg(e) };
    }
  };
  // 미답변 문의는 상품 문의 + 고객센터 미답변 합계(쿠팡 조회 기간 7일)
  const unanswered = async (): Promise<Count> => {
    try {
      const range = inquiryRange(Date.now());
      const [a, b] = await Promise.all([
        wingRequest(keys, "GET", onlineListPath(keys.vendorId), { query: onlineQuery(keys.vendorId, range) }).then((r) => normalizeOnline(r.data).total),
        wingRequest(keys, "GET", centerListPath(keys.vendorId), { query: centerQuery("NO_ANSWER", range) }).then((r) => normalizeCenter(r.data, "NO_ANSWER").total),
      ]);
      return { count: a + b, more: false };
    } catch (e) {
      return { error: wingMsg(e) };
    }
  };
  // 처리 중인 교환(쿠팡 조회 기간 7일)
  const openExchanges = async (): Promise<Count> => {
    try {
      const r = normalizeExchanges((await wingRequest(keys, "GET", exchangesPath(keys.vendorId), { query: exchangesQuery(exchangeRange(Date.now())) })).data);
      return { count: r.rows.filter(isOpenExchange).length, more: !!r.nextToken };
    } catch (e) {
      return { error: wingMsg(e) };
    }
  };

  const [accept, instruct, stopRequests, returnsReceived, inquiries, exchanges] = await Promise.all([orders("ACCEPT"), orders("INSTRUCT"), pending("RU"), pending("UC"), unanswered(), openExchanges()]);
  return { accept, instruct, stopRequests, returnsReceived, inquiries, exchanges, from, to };
}
