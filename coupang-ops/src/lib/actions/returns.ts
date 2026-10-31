"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import type { WingKeys } from "@/lib/coupang/keys";
import { takeReadSlot } from "@/lib/readGap";
import { ORDER_READ_GAP_SECONDS } from "@/lib/readGapRule";
import { checkOrderRange, cleanInvoice } from "@/lib/coupang/orders";
import {
  alreadyShippedPath,
  cancelBody,
  cancelOrderPath,
  normalizeCancel,
  normalizeReturnAction,
  normalizeReturns,
  returnApprovalPath,
  returnOnePath,
  returnReceiptPath,
  returnsPath,
  returnsQuery,
  returnSteps,
  stopShipmentPath,
  type ReturnRequest,
} from "@/lib/coupang/returns";

export type ReturnsResult = { ok: true; requests: ReturnRequest[]; nextToken: string } | { ok: false; error: string };
export type Done = { ok: true; message: string } | { ok: false; error: string };

const NO_KEYS = "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요.";
const wingMsg = (e: unknown) => (e instanceof WingApiError ? e.message : "연결 오류");
/** 쓰기 요청이 시간 초과·서버 오류로 끝나면 이미 처리됐을 수 있다 — 다시 보내지 않고 확인을 안내 */
const writeFail = (e: unknown, what: string): Done => {
  const status = e instanceof WingApiError ? e.status : 0;
  if (status === 0 || status >= 500) return { ok: false, error: `쿠팡 응답을 받지 못했습니다. 이미 ${what}됐을 수 있으니 목록을 다시 불러와 확인해 주세요.` };
  return { ok: false, error: `${what}하지 못했습니다: ${wingMsg(e)}` };
};

/** C3-4 반품·취소 요청 목록(회원 본인 키, 읽기만, 첫 쪽 조회 간격 제한) */
export async function listReturnRequestsAction(opt: { from: string; to: string; view: string; nextToken?: string }): Promise<ReturnsResult> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: NO_KEYS };
  const problem = checkOrderRange(opt.from, opt.to);
  if (problem) return { ok: false, error: problem };
  if (!opt.nextToken) {
    const wait = await takeReadSlot(user.id, "coupang_returns_read", ORDER_READ_GAP_SECONDS);
    if (wait > 0) return { ok: false, error: `조금 전에 불러왔습니다. ${wait}초 뒤에 다시 눌러 주세요.` };
  }
  try {
    const r = await wingRequest(keys, "GET", returnsPath(keys.vendorId), { query: returnsQuery(opt) });
    return { ok: true, ...normalizeReturns(r.data) };
  } catch (e) {
    return { ok: false, error: `쿠팡 반품·취소 요청을 읽지 못했습니다: ${wingMsg(e)}` };
  }
}

/** 처리 직전에 쿠팡에서 요청을 다시 읽어 조건(출고중지요청·반품접수 + 미출고)을 확인한다 — 화면 값을 믿지 않음 */
async function currentRequest(keys: WingKeys, receiptId: number): Promise<ReturnRequest | null> {
  const r = await wingRequest(keys, "GET", returnOnePath(keys.vendorId, receiptId));
  return normalizeReturns(r.data).requests.find((x) => x.receiptId === receiptId) ?? null;
}

async function checkedRequest(keys: WingKeys, receiptId: number, what: string): Promise<{ cur: ReturnRequest } | { error: string }> {
  try {
    const cur = await currentRequest(keys, receiptId);
    if (!cur) return { error: "쿠팡에서 이 요청을 찾지 못했습니다." };
    if (!cur.actionable) return { error: `지금 상태(${cur.statusLabel}, ${cur.items.map((i) => i.releaseLabel).join("·")})에서는 ${what}를 할 수 없습니다.` };
    return { cur };
  } catch (e) {
    return { error: `요청 상태를 확인하지 못해 멈췄습니다: ${wingMsg(e)}` };
  }
}

/** 출고중지완료 — 아직 보내지 않은 주문을 보내지 않기로 확정(고객 취소 반영). cancelCount는 쿠팡의 접수 수량 그대로 */
export async function stopShipmentAction(receiptId: number): Promise<Done> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: NO_KEYS };
  const id = Number(receiptId);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "접수번호가 없습니다." };
  const c = await checkedRequest(keys, id, "출고중지 완료");
  if ("error" in c) return { ok: false, error: c.error };
  try {
    const r = await wingRequest(keys, "PATCH", stopShipmentPath(keys.vendorId, id), { body: { vendorId: keys.vendorId, receiptId: id, cancelCount: c.cur.cancelCountSum } });
    const a = normalizeReturnAction(r.data);
    return a.ok ? { ok: true, message: a.message } : { ok: false, error: a.message };
  } catch (e) {
    return writeFail(e, "출고중지 완료");
  }
}

/** 이미출고 — 출고중지 요청이 왔지만 이미 보낸 경우(송장 필요, 왕복 배송비는 판매자 귀책 — 명세) */
export async function alreadyShippedAction(receiptId: number, courier: string, invoice: string): Promise<Done> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: NO_KEYS };
  const id = Number(receiptId);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "접수번호가 없습니다." };
  const code = String(courier ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_]{2,30}$/.test(code)) return { ok: false, error: "택배사를 골라 주세요." };
  const inv = cleanInvoice(code, invoice);
  if ("error" in inv) return { ok: false, error: inv.error };
  const c = await checkedRequest(keys, id, "이미출고 처리");
  if ("error" in c) return { ok: false, error: c.error };
  try {
    const r = await wingRequest(keys, "PATCH", alreadyShippedPath(keys.vendorId, id), { body: { vendorId: keys.vendorId, receiptId: id, deliveryCompanyCode: code, invoiceNumber: inv.invoice } });
    const a = normalizeReturnAction(r.data);
    return a.ok ? { ok: true, message: a.message } : { ok: false, error: a.message };
  } catch (e) {
    return writeFail(e, "이미출고 처리");
  }
}

export type ReturnStepDone = { ok: true; message: string; request: ReturnRequest | null } | { ok: false; error: string };

/** 반품 입고 확인·승인 공통. 직전 상태를 다시 읽고, 재시도하지 않으며, 끝난 뒤 다시 읽어 다음 단계를 화면에 알린다 */
async function runReturnStep(receiptId: number, kind: "receipt" | "approve"): Promise<ReturnStepDone> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: NO_KEYS };
  const id = Number(receiptId);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "접수번호가 없습니다." };
  const what = kind === "receipt" ? "입고 확인" : "반품 승인";
  let cur: ReturnRequest | null;
  try {
    cur = await currentRequest(keys, id);
  } catch (e) {
    return { ok: false, error: `요청 상태를 확인하지 못해 멈췄습니다: ${wingMsg(e)}` };
  }
  if (!cur) return { ok: false, error: "쿠팡에서 이 요청을 찾지 못했습니다." };
  const steps = returnSteps(cur);
  if (kind === "receipt" ? !steps.canConfirmReceipt : !steps.canApprove) return { ok: false, error: `지금 상태(${cur.statusLabel})에서는 ${what}을 할 수 없습니다. 쿠팡이 이미 자동 처리했을 수 있습니다.` };
  try {
    const r = kind === "receipt"
      ? await wingRequest(keys, "PATCH", returnReceiptPath(keys.vendorId, id), { body: { vendorId: keys.vendorId, receiptId: id } })
      : await wingRequest(keys, "PATCH", returnApprovalPath(keys.vendorId, id), { body: { vendorId: keys.vendorId, receiptId: id, cancelCount: cur.cancelCountSum } });
    const d = (r.data as { data?: { resultCode?: unknown; resultMessage?: unknown } })?.data;
    if (String(d?.resultCode ?? "") === "FAIL") return { ok: false, error: String(d?.resultMessage ?? "쿠팡이 처리하지 않았습니다.") };
    const request = await currentRequest(keys, id).catch(() => null);
    return { ok: true, message: kind === "receipt" ? "입고 확인했습니다." : "반품을 승인했습니다. 환불이 진행됩니다.", request };
  } catch (e) {
    const failed = writeFail(e, what);
    return failed.ok ? { ok: false, error: what } : failed;
  }
}

export async function confirmReturnReceiptAction(receiptId: number): Promise<ReturnStepDone> {
  return runReturnStep(receiptId, "receipt");
}

export async function approveReturnAction(receiptId: number): Promise<ReturnStepDone> {
  return runReturnStep(receiptId, "approve");
}

/** 판매자 주문 취소(결제완료 = 즉시 취소, 상품준비중 = 출고중지). 배송 묶음 하나씩, 판매자 점수가 낮아짐 — 화면 확인 뒤 호출 */
export async function cancelOrderAction(orderId: number, reason: string, items: { vendorItemId: number; count: number }[]): Promise<Done> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: NO_KEYS };
  const list = Array.isArray(items) ? items.map((i) => ({ vendorItemId: Number(i.vendorItemId), count: Number(i.count) })) : [];
  const body = cancelBody({ vendorId: keys.vendorId, userId: keys.wingUserId, orderId: Number(orderId), reason, items: list });
  if ("error" in body) return { ok: false, error: String(body.error) };
  try {
    const r = await wingRequest(keys, "POST", cancelOrderPath(keys.vendorId, Number(orderId)), { body });
    const c = normalizeCancel(r.data);
    if (c.failed.length) return { ok: false, error: `일부 옵션(${c.failed.join(", ")})은 취소되지 않았습니다. 발주서를 다시 불러와 확인해 주세요.` };
    return { ok: true, message: c.receiptType === "STOP_SHIPMENT" ? `출고중지로 취소했습니다(${c.total}개).` : `주문을 취소했습니다(${c.total}개).` };
  } catch (e) {
    return writeFail(e, "주문 취소");
  }
}
