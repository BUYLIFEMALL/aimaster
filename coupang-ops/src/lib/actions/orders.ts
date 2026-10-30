"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { takeReadSlot } from "@/lib/readGap";
import { ORDER_READ_GAP_SECONDS } from "@/lib/readGapRule";
import { checkOrderRange, normalizeOrderSheets, ordersPath, ordersQuery, type OrderSheet } from "@/lib/coupang/orders";

export type OrdersResult = { ok: true; orders: OrderSheet[]; nextToken: string } | { ok: false; error: string };

/** C3-1 발주서 조회(회원 본인 키, 읽기만 — 주문 정보는 저장하지 않음) */
export async function listOrderSheetsAction(opt: { from: string; to: string; status: string; nextToken?: string }): Promise<OrdersResult> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: "먼저 「쿠팡 연결」에서 키를 등록해 주세요." };
  const problem = checkOrderRange(opt.from, opt.to);
  if (problem) return { ok: false, error: problem };
  if (!opt.nextToken) {
    // 첫 쪽만 간격 제한(고정 IP 프록시 사용량 보호). 「더 보기」는 앞 결과에 이어 보는 것이라 막지 않는다
    const wait = await takeReadSlot(user.id, "coupang_orders_read", ORDER_READ_GAP_SECONDS);
    if (wait > 0) return { ok: false, error: `조금 전에 불러왔습니다. ${wait}초 뒤에 다시 눌러 주세요.` };
  }
  try {
    const r = await wingRequest(keys, "GET", ordersPath(keys.vendorId), { query: ordersQuery(opt) });
    return { ok: true, ...normalizeOrderSheets(r.data) };
  } catch (e) {
    return { ok: false, error: `쿠팡 발주서를 읽지 못했습니다: ${e instanceof WingApiError ? e.message : "연결 오류"}` };
  }
}
