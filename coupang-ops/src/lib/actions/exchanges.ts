"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import type { WingKeys } from "@/lib/coupang/keys";
import { cleanInvoice } from "@/lib/coupang/orders";
import { canSendExchangeInvoice, EXCHANGE_READ_GAP_SECONDS, EXCHANGE_REJECT_REASONS, exchangeActionFailed, exchangeConfirmPath, exchangeInvoiceBody, exchangeInvoicePath, exchangeRange, exchangeRejectPath, exchangesPath, exchangesQuery, isOpenExchange, normalizeExchanges, type ExchangeRow } from "@/lib/coupang/exchanges";
import { takeReadSlot } from "@/lib/readGap";

export type ExchangeList = { ok: true; rows: ExchangeRow[]; nextToken: string } | { ok: false; error: string };
export type ExchangeDone = { ok: true; message: string; row: ExchangeRow | null } | { ok: false; error: string };

const NO_KEYS = "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요.";
const wingMsg = (e: unknown) => (e instanceof WingApiError ? e.message : "연결 오류");
const writeFail = (e: unknown, what: string): ExchangeDone => {
  const status = e instanceof WingApiError ? e.status : 0;
  if (status === 0 || status >= 500) return { ok: false, error: `쿠팡 응답을 받지 못했습니다. 이미 ${what}됐을 수 있으니 목록을 다시 불러와 확인해 주세요.` };
  return { ok: false, error: `${what}하지 못했습니다: ${wingMsg(e)}` };
};

/** 최근 7일 교환 요청(읽기만, 버튼을 눌렀을 때만) */
export async function listExchangesAction(nextToken?: string): Promise<ExchangeList> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: NO_KEYS };
  if (!nextToken) {
    const wait = await takeReadSlot(user.id, "coupang_exchange_read", EXCHANGE_READ_GAP_SECONDS);
    if (wait > 0) return { ok: false, error: `조금 전에 불러왔습니다. ${wait}초 뒤에 다시 눌러 주세요.` };
  }
  try {
    const r = await wingRequest(keys, "GET", exchangesPath(keys.vendorId), { query: exchangesQuery({ ...exchangeRange(Date.now()), nextToken }) });
    return { ok: true, ...normalizeExchanges(r.data) };
  } catch (e) {
    return { ok: false, error: `쿠팡 교환 요청을 읽지 못했습니다: ${wingMsg(e)}` };
  }
}

/** 처리 직전·직후에 쿠팡에서 그 건을 다시 읽는다. 단건 조회가 없어 주문번호로 찾는다 */
async function readExchange(keys: WingKeys, orderId: number, exchangeId: number): Promise<ExchangeRow | null> {
  const r = await wingRequest(keys, "GET", exchangesPath(keys.vendorId), { query: exchangesQuery({ ...exchangeRange(Date.now()), orderId }) });
  return normalizeExchanges(r.data).rows.find((x) => x.exchangeId === exchangeId) ?? null;
}

async function start(orderId: number, exchangeId: number): Promise<{ keys: WingKeys; cur: ExchangeRow } | { error: string }> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { error: NO_KEYS };
  if (!Number.isInteger(exchangeId) || exchangeId <= 0 || !Number.isInteger(orderId) || orderId <= 0) return { error: "교환 번호가 올바르지 않습니다." };
  try {
    const cur = await readExchange(keys, orderId, exchangeId);
    if (!cur) return { error: "최근 7일 교환 요청에서 이 건을 찾지 못했습니다. WING에서 확인해 주세요." };
    if (!isOpenExchange(cur)) return { error: `지금 상태가 「${cur.statusLabel}」이라 처리하지 않았습니다.` };
    return { keys, cur };
  } catch (e) {
    return { error: `교환 상태를 확인하지 못해 멈췄습니다: ${wingMsg(e)}` };
  }
}

const after = (keys: WingKeys, cur: ExchangeRow) => readExchange(keys, cur.orderId, cur.exchangeId).catch(() => null);

/** 고객이 보낸 상품을 받았을 때 입고 확인. 재시도 없음 */
export async function confirmExchangeAction(orderId: number, exchangeId: number): Promise<ExchangeDone> {
  const c = await start(Number(orderId), Number(exchangeId));
  if ("error" in c) return { ok: false, error: c.error };
  try {
    const r = await wingRequest(c.keys, "PATCH", exchangeConfirmPath(c.keys.vendorId, c.cur.exchangeId), { body: { exchangeId: c.cur.exchangeId, vendorId: c.keys.vendorId } });
    const failed = exchangeActionFailed(r.data);
    if (failed) return { ok: false, error: failed };
    return { ok: true, message: "입고 확인했습니다. 교환 송장은 최대 10분 뒤부터 넣을 수 있습니다.", row: await after(c.keys, c.cur) };
  } catch (e) {
    return writeFail(e, "입고 확인");
  }
}

/** 교환 거부. 쿠팡이 허용하는 사유(품절·고객 철회)만 */
export async function rejectExchangeAction(orderId: number, exchangeId: number, reason: string): Promise<ExchangeDone> {
  if (!EXCHANGE_REJECT_REASONS.some((x) => x.code === reason)) return { ok: false, error: "거부 사유를 골라 주세요." };
  const c = await start(Number(orderId), Number(exchangeId));
  if ("error" in c) return { ok: false, error: c.error };
  try {
    const r = await wingRequest(c.keys, "PATCH", exchangeRejectPath(c.keys.vendorId, c.cur.exchangeId), { body: { exchangeId: String(c.cur.exchangeId), vendorId: c.keys.vendorId, exchangeRejectCode: reason } });
    const failed = exchangeActionFailed(r.data);
    if (failed) return { ok: false, error: failed };
    return { ok: true, message: "교환을 거부했습니다.", row: await after(c.keys, c.cur) };
  } catch (e) {
    return writeFail(e, "교환 거부");
  }
}

/** 교환 상품 송장 등록. 회수 완료와 새 배송번호를 쿠팡에서 다시 읽어 확인한 뒤 보낸다 */
export async function sendExchangeInvoiceAction(orderId: number, exchangeId: number, courier: string, invoice: string): Promise<ExchangeDone> {
  const code = String(courier ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_]{2,30}$/.test(code)) return { ok: false, error: "택배사를 골라 주세요." };
  const inv = cleanInvoice(code, invoice);
  if ("error" in inv) return { ok: false, error: inv.error };
  const c = await start(Number(orderId), Number(exchangeId));
  if ("error" in c) return { ok: false, error: c.error };
  if (!canSendExchangeInvoice(c.cur)) return { ok: false, error: `아직 송장을 넣을 수 없습니다(회수 상태: ${c.cur.collectLabel || "정보 없음"}). 입고 확인 뒤 최대 10분 기다린 다음 다시 불러와 주세요.` };
  try {
    const r = await wingRequest(c.keys, "POST", exchangeInvoicePath(c.keys.vendorId, c.cur.exchangeId), { body: exchangeInvoiceBody(c.keys.vendorId, c.cur.exchangeId, c.cur.shipmentBoxId, code, inv.invoice) });
    const failed = exchangeActionFailed(r.data);
    if (failed) return { ok: false, error: failed };
    return { ok: true, message: "교환 송장을 등록했습니다.", row: await after(c.keys, c.cur) };
  } catch (e) {
    return writeFail(e, "교환 송장 등록");
  }
}
