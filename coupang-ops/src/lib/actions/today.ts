"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { callBudgetBlock } from "@/lib/coupang/usage";
import { takeReadSlot } from "@/lib/readGap";
import { TODAY_READ_GAP_SECONDS } from "@/lib/readGapRule";
import { normalizeOrderSheets, ordersPath, ordersQuery } from "@/lib/coupang/orders";
import { blockedOrderIds, normalizeReturns, returnsPath, returnsQuery } from "@/lib/coupang/returns";

// 플랜 A1 「오늘 할 일」: 최근 31일(한국 날짜) 결제완료·상품준비중 발주서 수와 미처리 출고중지 요청·반품 접수 수.
// 쿠팡 읽기 4번(각 첫 쪽만, 50건 넘으면 「50+」). 버튼을 눌렀을 때만, 회원별 30초 간격(고정 IP 사용량 보호). 주문 내용은 돌려주지 않는다.

export type Count = { count: number; more: boolean } | { error: string };
export type TodayResult = { ok: true; accept: Count; instruct: Count; stopRequests: Count; returnsReceived: Count; from: string; to: string } | { ok: false; error: string };

const kstDay = (back: number) => new Date(Date.now() + 9 * 3_600_000 - back * 86_400_000).toISOString().slice(0, 10);
const wingMsg = (e: unknown) => (e instanceof WingApiError ? e.message : "연결 오류");

export async function todaySummaryAction(): Promise<TodayResult> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: "먼저 「쿠팡 연결」에서 키를 등록해 주세요." };
  const blocked = await callBudgetBlock(user.id);
  if (blocked) return { ok: false, error: blocked };
  const wait = await takeReadSlot(user.id, "coupang_today_read", TODAY_READ_GAP_SECONDS);
  if (wait > 0) return { ok: false, error: `조금 전에 불러왔습니다. ${wait}초 뒤에 다시 눌러 주세요.` };
  const from = kstDay(30);
  const to = kstDay(0);

  const orders = async (status: string): Promise<Count> => {
    try {
      const r = normalizeOrderSheets((await wingRequest(keys, "GET", ordersPath(keys.vendorId), { query: ordersQuery({ from, to, status }) })).data);
      return { count: r.orders.length, more: !!r.nextToken };
    } catch (e) {
      return { error: wingMsg(e) };
    }
  };
  // 반품·취소 요청은 아직 처리 안 된 것(출고중지요청·반품접수 상태)만 센다
  const pending = async (view: string): Promise<Count> => {
    try {
      const r = normalizeReturns((await wingRequest(keys, "GET", returnsPath(keys.vendorId), { query: returnsQuery({ from, to, view }) })).data);
      return { count: blockedOrderIds(r.requests).size, more: !!r.nextToken };
    } catch (e) {
      return { error: wingMsg(e) };
    }
  };

  const [accept, instruct, stopRequests, returnsReceived] = await Promise.all([orders("ACCEPT"), orders("INSTRUCT"), pending("RU"), pending("UC")]);
  return { ok: true, accept, instruct, stopRequests, returnsReceived, from, to };
}
