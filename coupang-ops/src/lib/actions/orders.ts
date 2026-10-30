"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { takeReadSlot } from "@/lib/readGap";
import { unresolvedStopOrders } from "@/lib/coupang/returnGuard";
import { ORDER_READ_GAP_SECONDS } from "@/lib/readGapRule";
import { ackIds, ackPath, checkOrderRange, invoiceBody, invoicePath, normalizeAckResult, normalizeOrderSheets, ordersPath, ordersQuery, type AckResult, type InvoiceEntry, type OrderSheet } from "@/lib/coupang/orders";

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

export type AckActionResult = { ok: true; results: AckResult[]; summary: string; preparing?: OrderSheet[] } | { ok: false; error: string };

/** C3-2 결제완료 → 상품준비중(실제 주문 상태가 바뀜 — 화면에서 확인을 한 번 더 받은 뒤 호출, 다시 보내지 않음) */
export async function acknowledgeOrdersAction(shipmentBoxIds: number[], range?: { from: string; to: string }): Promise<AckActionResult> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: "먼저 「쿠팡 연결」에서 키를 등록해 주세요." };
  const picked = ackIds(Array.isArray(shipmentBoxIds) ? shipmentBoxIds : []);
  if ("error" in picked) return { ok: false, error: picked.error };
  try {
    const r = await wingRequest(keys, "PATCH", ackPath(keys.vendorId), { body: { vendorId: keys.vendorId, shipmentBoxIds: picked.ids } });
    const done = normalizeAckResult(r.data, picked.ids);
    // A4: 처리 뒤 고객이 배송지를 바꿨을 수 있다(명세) → 상품준비중 목록을 다시 읽어 화면이 비교·이어서 송장 입력(A2)
    let preparing: OrderSheet[] | undefined;
    if (range && !checkOrderRange(range.from, range.to) && done.results.some((x) => x.ok)) {
      try {
        preparing = [];
        let token = "";
        for (let page = 0; page < 3; page++) {
          const l = normalizeOrderSheets((await wingRequest(keys, "GET", ordersPath(keys.vendorId), { query: ordersQuery({ from: range.from, to: range.to, status: "INSTRUCT", nextToken: token || undefined }) })).data);
          preparing.push(...l.orders);
          if (!l.nextToken) break;
          token = l.nextToken;
        }
      } catch {
        preparing = undefined; // 다시 읽기 실패는 처리 결과에 영향 없음 — 화면이 안내
      }
    }
    return { ok: true, ...done, preparing };
  } catch (e) {
    const status = e instanceof WingApiError ? e.status : 0;
    if (status === 0 || status >= 500) {
      // 시간 초과는 쿠팡에서 이미 처리됐을 수 있다(명세: 504·521은 조회로 확인 후 재시도) — 자동으로 다시 보내지 않는다
      return { ok: false, error: "쿠팡 응답을 받지 못했습니다. 이미 처리됐을 수 있으니 「상품준비중」 상태로 발주서를 다시 불러와 확인한 뒤, 빠진 주문만 다시 처리해 주세요." };
    }
    return { ok: false, error: `상품준비중으로 바꾸지 못했습니다: ${e instanceof WingApiError ? e.message : "연결 오류"}` };
  }
}

/** C3-3 송장 등록(상품준비중 → 배송지시) / 수정(배송지시 이후). 실제 주문이 바뀜 — 화면 확인 뒤 호출, 다시 보내지 않음 */
export async function submitInvoicesAction(mode: "upload" | "update", entries: InvoiceEntry[]): Promise<AckActionResult> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: "먼저 「쿠팡 연결」에서 키를 등록해 주세요." };
  const m = mode === "update" ? "update" : "upload";
  const built = invoiceBody(keys.vendorId, Array.isArray(entries) ? entries : []);
  if ("errors" in built) return { ok: false, error: built.errors.slice(0, 5).join(" / ") };
  if (m === "upload") {
    // 송장 전 안전 점검: 출고중지요청·반품접수가 걸린 주문은 보내지 않는다(보내면 왕복 배송비 판매자 부담 — 명세)
    let blocked: Set<number>;
    try {
      blocked = await unresolvedStopOrders(keys);
    } catch (e) {
      return { ok: false, error: `출고중지 요청을 확인하지 못해 송장 등록을 멈췄습니다: ${e instanceof WingApiError ? e.message : "연결 오류"}` };
    }
    const hit = entries.filter((x) => blocked.has(Number(x.orderId))).map((x) => x.orderId);
    if (hit.length) return { ok: false, error: `출고중지 요청·반품 접수가 들어온 주문이 있어 멈췄습니다(주문번호 ${hit.join(", ")}). 「↩ 출고중지·취소」에서 먼저 처리하고, 나머지만 다시 등록해 주세요.` };
  }
  try {
    const r = await wingRequest(keys, "POST", invoicePath(keys.vendorId, m), { body: built.body });
    return { ok: true, ...normalizeAckResult(r.data, built.ids, m === "upload" ? "송장을 등록했습니다(배송지시로 바뀜)." : "송장을 고쳤습니다.") };
  } catch (e) {
    const status = e instanceof WingApiError ? e.status : 0;
    if (status === 0 || status >= 500) {
      return { ok: false, error: "쿠팡 응답을 받지 못했습니다. 이미 처리됐을 수 있으니 발주서를 다시 불러와 송장이 들어갔는지 확인한 뒤, 빠진 주문만 다시 처리해 주세요." };
    }
    return { ok: false, error: `송장을 ${m === "upload" ? "등록" : "수정"}하지 못했습니다: ${e instanceof WingApiError ? e.message : "연결 오류"}` };
  }
}
