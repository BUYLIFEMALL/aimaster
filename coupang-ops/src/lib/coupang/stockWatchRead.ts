import "server-only";
import { wingRequest } from "./client";
import type { WingKeys } from "./keys";
import { inventoryPath, normalizeInventory } from "./items";
import { stockAlertLine, type StockWatch, type WatchedStock } from "./stock";

const WORKERS = 3; // 동시 호출 수(쿠팡 429 방지)

/** R9 회원이 고른 옵션만 읽어 아침 요약 한 줄을 만든다(읽기만). 못 읽은 건은 세어서 알리고 요약은 그대로 보낸다 */
export async function readStockAlertLine(keys: WingKeys, watch: StockWatch[], limit: number): Promise<string> {
  const read: WatchedStock[] = [];
  let failed = 0;
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(WORKERS, watch.length) }, async () => {
    while (next < watch.length) {
      const w = watch[next++];
      try {
        const inv = normalizeInventory((await wingRequest(keys, "GET", inventoryPath(w.vendorItemId))).data);
        if (inv) read.push({ label: w.label, stock: inv.stock, onSale: inv.onSale });
        else failed++;
      } catch {
        failed++;
      }
    }
  }));
  return stockAlertLine(read, limit, failed);
}
