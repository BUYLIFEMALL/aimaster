"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { COUPON_ITEM_STATUSES, checkPlace, checkRemote, checkReturnContract, couponItemsPath, normalizeCouponItems, normalizeWithdrawals, outboundCreateBody, outboundCreatePath, outboundUpdateBody, outboundUpdatePath, pickupBody, pickupInvoicePath, placeResult, returnCreateBody, returnCreatePath, returnUpdateBody, returnUpdatePath, withdrawalsPath, withdrawalsQuery, type PlaceForm, type RemoteFee, type ReturnContract, type Withdrawal } from "@/lib/coupang/logisticsWrite";
import { cleanInvoice } from "@/lib/coupang/orders";

type Done = { ok: true; message: string } | { ok: false; error: string };
const NO_KEYS = { ok: false, error: "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요." } as const;
const wingMsg = (e: unknown) => (e instanceof WingApiError ? e.message : "응답을 받지 못했습니다. 이미 처리됐을 수 있으니 다시 보내기 전에 WING에서 확인해 주세요.");

async function keysOf() {
  const user = await requireProgramAccess();
  return getWingKeys(user.id);
}

const finish = (raw: unknown, ok: string): Done => {
  const r = placeResult(raw);
  return r.ok ? { ok: true, message: ok.replace("{code}", r.message) } : { ok: false, error: r.message || "쿠팡이 처리하지 않았습니다." };
};

export async function saveOutboundAction(input: { code?: string; place: PlaceForm; remote: RemoteFee }): Promise<Done> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  const problem = checkPlace(input.place) || (input.code ? "" : checkRemote(input.remote));
  if (problem) return { ok: false, error: problem };
  try {
    if (input.code) return finish((await wingRequest(keys, "PUT", outboundUpdatePath(keys.vendorId, input.code), { body: outboundUpdateBody(keys.vendorId, keys.wingUserId, input.code, input.place) })).data, "출고지를 고쳤습니다.");
    return finish((await wingRequest(keys, "POST", outboundCreatePath(keys.vendorId), { body: outboundCreateBody(keys.vendorId, keys.wingUserId, input.place, input.remote) })).data, "출고지를 만들었습니다(코드 {code}). 위 「쿠팡에서 불러오기」로 고를 수 있습니다.");
  } catch (e) {
    return { ok: false, error: `출고지를 저장하지 못했습니다: ${wingMsg(e)}` };
  }
}

export async function saveReturnCenterAction(input: { code?: string; place: PlaceForm; contract: ReturnContract }): Promise<Done> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  const problem = checkPlace(input.place) || checkReturnContract(input.contract, !input.code);
  if (problem) return { ok: false, error: problem };
  try {
    if (input.code) return finish((await wingRequest(keys, "PUT", returnUpdatePath(keys.vendorId, input.code), { body: returnUpdateBody(keys.vendorId, keys.wingUserId, input.code, input.place, input.contract) })).data, "반품지를 고쳤습니다.");
    return finish((await wingRequest(keys, "POST", returnCreatePath(keys.vendorId), { body: returnCreateBody(keys.vendorId, keys.wingUserId, input.place, input.contract) })).data, "반품지를 만들었습니다(코드 {code}). 위 「쿠팡에서 불러오기」로 고를 수 있습니다.");
  } catch (e) {
    return { ok: false, error: `반품지를 저장하지 못했습니다: ${wingMsg(e)}` };
  }
}

/** 회수 송장 등록(직접 회수하는 판매자). 재시도 없음 */
export async function uploadPickupInvoiceAction(input: { type: "RETURN" | "EXCHANGE"; receiptId: number; courier: string; invoice: string; regNumber: string }): Promise<Done> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  const id = Number(input.receiptId);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "접수번호가 없습니다." };
  const courier = String(input.courier ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_]{2,30}$/.test(courier)) return { ok: false, error: "택배사를 골라 주세요." };
  const inv = cleanInvoice(courier, input.invoice);
  if ("error" in inv) return { ok: false, error: inv.error };
  try {
    await wingRequest(keys, "POST", pickupInvoicePath(keys.vendorId), { body: pickupBody(input.type === "EXCHANGE" ? "EXCHANGE" : "RETURN", id, courier, inv.invoice, String(input.regNumber ?? "")) });
    return { ok: true, message: "회수 송장을 등록했습니다. 택배기사가 회수하기 전까지 고객이 철회할 수 있습니다." };
  } catch (e) {
    return { ok: false, error: `회수 송장을 등록하지 못했습니다: ${wingMsg(e)}` };
  }
}

export async function listWithdrawalsAction(): Promise<{ ok: true; rows: Withdrawal[] } | { ok: false; error: string }> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  try {
    return { ok: true, rows: normalizeWithdrawals((await wingRequest(keys, "GET", withdrawalsPath(keys.vendorId), { query: withdrawalsQuery(Date.now()) })).data) };
  } catch (e) {
    return { ok: false, error: `철회 이력을 읽지 못했습니다: ${e instanceof WingApiError ? e.message : "연결 오류"}` };
  }
}

export async function listCouponItemsAction(couponId: number, status: string): Promise<{ ok: true; vendorItemIds: number[]; total: number } | { ok: false; error: string }> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  const s = COUPON_ITEM_STATUSES.includes(status) ? status : "APPLIED";
  try {
    return { ok: true, ...normalizeCouponItems((await wingRequest(keys, "GET", couponItemsPath(keys.vendorId, Number(couponId)), { query: `status=${s}&page=0&size=100&sort=desc` })).data) };
  } catch (e) {
    return { ok: false, error: `적용 옵션을 읽지 못했습니다: ${e instanceof WingApiError ? e.message : "연결 오류"}` };
  }
}
