"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { productPath } from "@/lib/coupang/status";
import { autoOptionPath, autoOptionResult, buildEditBody, buildPartialBody, checkDelivery, checkOriginalPrice, checkProductFields, EDIT_PATH, NOT_EDITABLE, NOT_PARTIAL, normalizeEditView, originalPricePath, partialPath, type DeliveryFields, type EditView, type ProductFields } from "@/lib/coupang/productEdit";

import { buildCopyBody, checkCopyName } from "@/lib/coupang/productCopy";

type Done = { ok: true; message: string } | { ok: false; error: string };
const NO_KEYS = { ok: false, error: "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요." } as const;

async function keysOf() {
  const user = await requireProgramAccess();
  return getWingKeys(user.id);
}
const fail = (e: unknown, what: string): Done => ({ ok: false, error: `${what}: ${e instanceof WingApiError ? e.message : "연결 오류 — WING에서 바뀌었는지 확인해 주세요."}` });

export async function loadProductEditAction(sellerProductId: number): Promise<{ ok: true; view: EditView } | { ok: false; error: string }> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  try {
    return { ok: true, view: normalizeEditView((await wingRequest(keys, "GET", productPath(Number(sellerProductId)))).data) };
  } catch (e) {
    return fail(e, "상품을 읽지 못했습니다") as { ok: false; error: string };
  }
}

/** 상품명·브랜드·검색어. 보내기 직전 다시 읽어 전체 본문을 만들고, 재시도하지 않는다 */
export async function saveProductFieldsAction(sellerProductId: number, fields: ProductFields): Promise<Done> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  const problem = checkProductFields(fields);
  if (problem) return { ok: false, error: problem };
  try {
    const raw = (await wingRequest(keys, "GET", productPath(Number(sellerProductId)))).data;
    const status = normalizeEditView(raw).statusName;
    if (NOT_EDITABLE.includes(status)) return { ok: false, error: `지금 상태(${status})에서는 수정할 수 없습니다.` };
    await wingRequest(keys, "PUT", EDIT_PATH, { body: buildEditBody(raw, fields) });
    return { ok: true, message: "수정을 보냈습니다. 승인된 상품은 쿠팡 재승인 뒤 반영됩니다." };
  } catch (e) {
    return fail(e, "상품을 수정하지 못했습니다");
  }
}

/** R4 복사 등록: 지금 내용을 새 상품으로 저장만 한다(승인 요청 안 함, 재시도 없음). 상품 등록 기록과 별개로 WING에 임시저장으로 남는다 */
export async function copyProductAction(sellerProductId: number, name: string): Promise<Done> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  const problem = checkCopyName(String(name ?? ""));
  if (problem) return { ok: false, error: problem };
  try {
    const raw = (await wingRequest(keys, "GET", productPath(Number(sellerProductId)))).data;
    const saleStartedAt = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 19);
    const r = (await wingRequest<{ data?: unknown }>(keys, "POST", EDIT_PATH, { body: buildCopyBody(raw, { name, vendorId: keys.vendorId, wingUserId: keys.wingUserId, saleStartedAt }) })).data;
    return { ok: true, message: `복사본을 저장했습니다${r?.data ? `(상품번호 ${r.data})` : ""}. 목록을 다시 불러와 확인한 뒤 옵션을 고치고 승인 요청해 주세요.` };
  } catch (e) {
    return fail(e, "복사하지 못했습니다. 다시 보내기 전에 WING을 확인해 주세요");
  }
}

/** 배송·반품 값(승인 불필요) */
export async function saveDeliveryAction(sellerProductId: number, fields: DeliveryFields): Promise<Done> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  const problem = checkDelivery(fields);
  if (problem) return { ok: false, error: problem };
  try {
    const status = normalizeEditView((await wingRequest(keys, "GET", productPath(Number(sellerProductId)))).data).statusName;
    if (NOT_PARTIAL.includes(status)) return { ok: false, error: `지금 상태(${status})에서는 이 수정을 쓸 수 없습니다. 승인된 상품만 됩니다.` };
    await wingRequest(keys, "PUT", partialPath(Number(sellerProductId)), { body: buildPartialBody(Number(sellerProductId), fields) });
    return { ok: true, message: "배송·반품 값을 바꿨습니다." };
  } catch (e) {
    return fail(e, "배송·반품 값을 바꾸지 못했습니다");
  }
}

export async function updateOriginalPriceAction(vendorItemId: number, price: number): Promise<Done> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  const problem = checkOriginalPrice(Number(price));
  if (problem) return { ok: false, error: problem };
  try {
    await wingRequest(keys, "PUT", originalPricePath(Number(vendorItemId), Number(price)));
    return { ok: true, message: "할인 기준가를 바꿨습니다." };
  } catch (e) {
    return fail(e, "할인 기준가를 바꾸지 못했습니다");
  }
}

/** 자동생성옵션 켜기·끄기(옵션ID가 없으면 판매자 전체) */
export async function setAutoOptionAction(on: boolean, vendorItemId?: number): Promise<Done> {
  const keys = await keysOf();
  if (!keys) return NO_KEYS;
  try {
    const r = autoOptionResult((await wingRequest(keys, "POST", autoOptionPath(on === true, vendorItemId ? Number(vendorItemId) : undefined))).data);
    return r.ok ? { ok: true, message: r.message } : { ok: false, error: r.message };
  } catch (e) {
    return fail(e, "자동생성옵션을 바꾸지 못했습니다");
  }
}
