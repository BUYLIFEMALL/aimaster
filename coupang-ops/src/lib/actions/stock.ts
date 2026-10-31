"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { inventoryPath, normalizeInventory, normalizeProductItems } from "@/lib/coupang/items";
import { LIST_PATH, listQuery, normalizeProductList } from "@/lib/coupang/listing";
import { productPath } from "@/lib/coupang/status";
import { isCheckableStatus, pickOptions, STOCK_MAX_OPTIONS, STOCK_PAGE_SIZE, STOCK_READ_GAP_SECONDS } from "@/lib/coupang/stock";
import { callBudgetBlock } from "@/lib/coupang/usage";
import { takeReadSlot } from "@/lib/readGap";

export type StockRow = { sellerProductId: number; productName: string; vendorItemId: number; itemName: string; stock: number; salePrice: number; onSale: boolean };
export type StockScan = { ok: true; rows: StockRow[]; nextToken: string; products: number; calls: number; failed: number; skipped: number } | { ok: false; error: string };

const WORKERS = 3; // 동시 호출 수(쿠팡 429 방지)

async function eachLimited<T>(list: T[], work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(WORKERS, list.length) }, async () => {
    while (next < list.length) await work(list[next++]);
  }));
}

/** B1 버튼을 눌렀을 때만 상품 20개씩 재고를 읽는다(읽기만, 회원 본인 키). 첫 쪽만 간격 제한 — 「다음 20개」는 앞 결과에 이어 보는 것 */
export async function scanStockAction(nextToken?: string): Promise<StockScan> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: "먼저 「쿠팡 연결」에서 키를 등록해 주세요." };
  const blocked = await callBudgetBlock(user.id);
  if (blocked) return { ok: false, error: blocked };
  if (!nextToken) {
    const wait = await takeReadSlot(user.id, "coupang_stock_read", STOCK_READ_GAP_SECONDS);
    if (wait > 0) return { ok: false, error: `조금 전에 점검했습니다. ${wait}초 뒤에 다시 눌러 주세요.` };
  }

  let calls = 1;
  let failed = 0;
  let skipped = 0;
  try {
    const list = normalizeProductList((await wingRequest(keys, "GET", LIST_PATH, { query: listQuery(keys.vendorId, { nextToken, maxPerPage: STOCK_PAGE_SIZE }) })).data);
    const targets = list.items.filter((p) => isCheckableStatus(p.statusName));

    const options: Omit<StockRow, "stock" | "salePrice" | "onSale">[] = [];
    await eachLimited(targets, async (p) => {
      calls++;
      try {
        const { items } = normalizeProductItems((await wingRequest(keys, "GET", productPath(p.sellerProductId))).data);
        const { picked, skipped: over } = pickOptions(items, STOCK_MAX_OPTIONS - options.length);
        skipped += over;
        for (const it of picked) options.push({ sellerProductId: p.sellerProductId, productName: p.name, vendorItemId: it.vendorItemId, itemName: it.itemName });
      } catch {
        failed++;
      }
    });

    const rows: StockRow[] = [];
    await eachLimited(options, async (o) => {
      calls++;
      try {
        const inv = normalizeInventory((await wingRequest(keys, "GET", inventoryPath(o.vendorItemId))).data);
        if (!inv) failed++;
        else rows.push({ ...o, stock: inv.stock, salePrice: inv.salePrice, onSale: inv.onSale });
      } catch {
        failed++;
      }
    });
    return { ok: true, rows, nextToken: list.nextToken, products: targets.length, calls, failed, skipped };
  } catch (e) {
    return { ok: false, error: `상품 목록을 읽지 못했습니다: ${e instanceof WingApiError ? e.message : "연결 오류"}` };
  }
}
