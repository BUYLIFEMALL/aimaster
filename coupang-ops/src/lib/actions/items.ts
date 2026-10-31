"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { productPath } from "@/lib/coupang/status";
import { checkPrice, checkQuantity, inventoryPath, normalizeInventory, normalizeProductItems, pricePath, quantityPath, salePath, type Inventory, type ProductItem } from "@/lib/coupang/items";

export type ItemRow = ProductItem & { inventory: Inventory | null };
export type ItemsResult = { ok: true; name: string; statusName: string; items: ItemRow[] } | { ok: false; error: string };
type Done = { ok: true; message: string } | { ok: false; error: string };

const MAX_ITEMS = 30; // 한 상품 옵션 현재값은 30개까지만 한 번에 읽음(호출 수 보호)

async function keysOrError() {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  return keys;
}

const fail = (e: unknown, what: string): Done => ({ ok: false, error: `${what}: ${e instanceof WingApiError ? e.message : "연결 오류 — WING에서 바뀌었는지 확인해 주세요."}` });

/** 옵션 목록 + 옵션별 현재 재고·판매가·판매 상태(읽기만) */
export async function loadItemsAction(sellerProductId: number): Promise<ItemsResult> {
  const keys = await keysOrError();
  if (!keys) return { ok: false, error: "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요." };
  try {
    const p = normalizeProductItems((await wingRequest(keys, "GET", productPath(Number(sellerProductId)))).data);
    const items = await Promise.all(
      p.items.map(async (it, i): Promise<ItemRow> => {
        if (!it.vendorItemId || i >= MAX_ITEMS) return { ...it, inventory: null };
        const inv = await wingRequest(keys, "GET", inventoryPath(it.vendorItemId)).then((r) => normalizeInventory(r.data)).catch(() => null);
        return { ...it, inventory: inv };
      }),
    );
    return { ok: true, name: p.name, statusName: p.statusName, items };
  } catch (e) {
    return fail(e, "옵션을 읽지 못했습니다") as ItemsResult;
  }
}

/** 지금 값을 쿠팡에서 다시 읽어 검사한 뒤 보낸다(화면 값은 믿지 않음). 쓰기는 재시도하지 않는다(client) */
async function currentInventory(keys: NonNullable<Awaited<ReturnType<typeof getWingKeys>>>, vendorItemId: number) {
  return normalizeInventory((await wingRequest(keys, "GET", inventoryPath(vendorItemId))).data);
}

export async function updatePriceAction(vendorItemId: number, price: number): Promise<Done> {
  const keys = await keysOrError();
  if (!keys) return { ok: false, error: "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요." };
  try {
    const cur = await currentInventory(keys, vendorItemId);
    if (!cur) return { ok: false, error: "옵션의 지금 판매가를 읽지 못해 바꾸지 않았습니다." };
    const problem = checkPrice(cur.salePrice, Number(price));
    if (problem) return { ok: false, error: problem };
    const r = await wingRequest(keys, "PUT", pricePath(vendorItemId, Number(price)));
    return { ok: true, message: String((r.data as { message?: unknown })?.message || "가격을 바꿨습니다.") };
  } catch (e) {
    return fail(e, "가격을 바꾸지 못했습니다");
  }
}

export async function updateQuantityAction(vendorItemId: number, quantity: number): Promise<Done> {
  const keys = await keysOrError();
  if (!keys) return { ok: false, error: "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요." };
  try {
    const cur = await currentInventory(keys, vendorItemId);
    if (!cur) return { ok: false, error: "옵션의 지금 재고를 읽지 못해 바꾸지 않았습니다." };
    const problem = checkQuantity(cur.stock, Number(quantity));
    if (problem) return { ok: false, error: problem };
    const r = await wingRequest(keys, "PUT", quantityPath(vendorItemId, Number(quantity)));
    return { ok: true, message: String((r.data as { message?: unknown })?.message || "재고를 바꿨습니다.") };
  } catch (e) {
    return fail(e, "재고를 바꾸지 못했습니다");
  }
}

export async function setSaleAction(vendorItemId: number, on: boolean): Promise<Done> {
  const keys = await keysOrError();
  if (!keys) return { ok: false, error: "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요." };
  try {
    const cur = await currentInventory(keys, vendorItemId);
    if (cur && cur.onSale === on) return { ok: false, error: on ? "이미 판매 중입니다." : "이미 판매 중지 상태입니다." };
    const r = await wingRequest(keys, "PUT", salePath(vendorItemId, on));
    return { ok: true, message: String((r.data as { message?: unknown })?.message || (on ? "판매를 재개했습니다." : "판매를 중지했습니다.")) };
  } catch (e) {
    return fail(e, on ? "판매를 재개하지 못했습니다" : "판매를 중지하지 못했습니다");
  }
}
