"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { checkDownloadCoupon, checkLongUndelivery, DL_CREATE_PATH, DL_EXPIRE_PATH, DL_ITEMS_PATH, DL_STATUS_PATH, dlCreateBody, dlExpireBody, dlItemsBody, dlResult, dlStatus, longUndeliveryPath, type DlDraft } from "@/lib/coupang/downloadCoupon";

type Done = { ok: true; message: string; couponId?: number; transactionId?: string } | { ok: false; error: string };
const NO_KEYS: Done = { ok: false, error: "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요." };
const wingMsg = (e: unknown) => (e instanceof WingApiError ? e.message : "응답을 받지 못했습니다. 이미 처리됐을 수 있으니 다시 보내기 전에 WING에서 확인해 주세요.");

async function keysOf() {
  const user = await requireProgramAccess();
  return getWingKeys(user.id);
}

/** 생성과 옵션 적용을 한 번에 한다(적용 상품은 뒤에 못 바꾸고, 적용 실패하면 쿠팡이 쿠폰을 파기한다). 재시도 없음 */
export async function createDownloadCouponAction(draft: DlDraft): Promise<Done> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  const problem = checkDownloadCoupon(draft);
  if (problem) return { ok: false, error: problem };
  let couponId = 0;
  try {
    const created = (await wingRequest<{ couponId?: unknown }>(keys, "POST", DL_CREATE_PATH, { body: dlCreateBody(draft, keys.wingUserId) })).data;
    couponId = Number(created?.couponId) || 0;
    if (!couponId) return { ok: false, error: "쿠팡 응답에 쿠폰 번호가 없습니다. 다시 보내기 전에 WING에서 확인해 주세요." };
  } catch (e) {
    return { ok: false, error: `쿠폰을 만들지 못했습니다: ${wingMsg(e)}` };
  }
  try {
    const r = dlResult((await wingRequest(keys, "PUT", DL_ITEMS_PATH, { body: dlItemsBody(couponId, keys.wingUserId, draft.vendorItemIds) })).data);
    if (!r.ok) return { ok: false, error: `쿠폰 #${couponId}에 옵션을 넣지 못했습니다: ${r.error || "쿠팡 거절"}. 이 쿠폰은 쿠팡이 파기합니다.` };
    return { ok: true, message: `쿠폰 #${couponId}을 만들고 옵션 ${draft.vendorItemIds.length}개 적용을 요청했습니다. 고객에게 보이기까지 1시간쯤 걸립니다.`, couponId, transactionId: r.transactionId };
  } catch (e) {
    return { ok: false, error: `쿠폰 #${couponId}은 만들어졌지만 옵션 적용 결과를 알 수 없습니다: ${wingMsg(e)}` };
  }
}

export async function expireDownloadCouponAction(couponId: number): Promise<Done> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  const id = Number(couponId);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "쿠폰 번호를 숫자로 넣어 주세요." };
  try {
    const r = dlResult((await wingRequest(keys, "POST", DL_EXPIRE_PATH, { body: dlExpireBody(id, keys.wingUserId) })).data);
    if (!r.ok) return { ok: false, error: r.error || "쿠팡이 거절했습니다." };
    return { ok: true, message: `쿠폰 #${id} 파기를 요청했습니다.`, couponId: id, transactionId: r.transactionId };
  } catch (e) {
    return { ok: false, error: `쿠폰을 파기하지 못했습니다: ${wingMsg(e)}` };
  }
}

export async function downloadCouponStatusAction(transactionId: string): Promise<Done> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  try {
    const s = dlStatus((await wingRequest(keys, "GET", DL_STATUS_PATH, { query: `requestTransactionId=${encodeURIComponent(String(transactionId))}` })).data);
    return { ok: true, message: `처리 결과: ${s.status || "처리 중"} · 성공 ${s.succeeded} · 실패 ${s.failed}${s.reasons.length ? ` · ${s.reasons.join(" / ").slice(0, 300)}` : ""}` };
  } catch (e) {
    return { ok: false, error: `처리 결과를 읽지 못했습니다: ${e instanceof WingApiError ? e.message : "연결 오류"}` };
  }
}

/** A6 장기 미배송 배송완료. 분쟁 비용이 판매자 부담이라 화면에서 2단 확인 뒤에만, 재시도 없음 */
export async function completeLongUndeliveryAction(shipmentBoxId: number, invoice: string): Promise<Done> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  const id = Number(shipmentBoxId);
  const problem = checkLongUndelivery(id, String(invoice ?? ""));
  if (problem) return { ok: false, error: problem };
  try {
    const r = (await wingRequest<{ data?: unknown }>(keys, "POST", longUndeliveryPath(keys.vendorId), { body: { shipmentBoxId: id, invoiceNumber: String(invoice).trim() } })).data;
    return r?.data === true ? { ok: true, message: "배송완료로 처리했습니다." } : { ok: false, error: "쿠팡이 처리하지 않았습니다. 배송지시 후 30~32일이 지났는지 확인해 주세요." };
  } catch (e) {
    return { ok: false, error: `처리하지 못했습니다: ${wingMsg(e)}` };
  }
}
