"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { inventoryPath, normalizeInventory } from "@/lib/coupang/items";
import { checkRevenueRange, normalizeRevenue, normalizeSettlements, REVENUE_PATH, REVENUE_READ_GAP_SECONDS, revenueQuery, RUNOUT_MAX_OPTIONS, SETTLEMENT_PATH, settlementQuery, type RevenueLine, type RevenueOrderShipping, type SettlementRow } from "@/lib/coupang/revenue";
import { callBudgetBlock } from "@/lib/coupang/usage";
import { takeReadSlot } from "@/lib/readGap";

export type RevenueResult = { ok: true; lines: RevenueLine[]; shipping: RevenueOrderShipping[]; nextToken: string } | { ok: false; error: string };
const NO_KEYS = "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요.";
const wingMsg = (e: unknown) => (e instanceof WingApiError ? e.message : "연결 오류");

/** 매출내역 한 쪽(읽기 1회). 결과는 저장하지 않는다 */
export async function loadRevenueAction(opt: { from: string; to: string; token?: string }): Promise<RevenueResult> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: NO_KEYS };
  const problem = checkRevenueRange(opt.from, opt.to, Date.now());
  if (problem) return { ok: false, error: problem };
  const blocked = await callBudgetBlock(user.id);
  if (blocked) return { ok: false, error: blocked };
  if (!opt.token) {
    const wait = await takeReadSlot(user.id, "coupang_revenue_read", REVENUE_READ_GAP_SECONDS);
    if (wait > 0) return { ok: false, error: `조금 전에 불러왔습니다. ${wait}초 뒤에 다시 눌러 주세요.` };
  }
  try {
    const r = await wingRequest(keys, "GET", REVENUE_PATH, { query: revenueQuery(keys.vendorId, opt) });
    return { ok: true, ...normalizeRevenue(r.data) };
  } catch (e) {
    return { ok: false, error: `매출내역을 읽지 못했습니다: ${wingMsg(e)}` };
  }
}

/** 지급내역(읽기 1회). 계좌 정보는 돌려주지 않는다 */
export async function loadSettlementsAction(month: string): Promise<{ ok: true; rows: SettlementRow[] } | { ok: false; error: string }> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: NO_KEYS };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month))) return { ok: false, error: "매출인식월을 골라 주세요." };
  const blocked = await callBudgetBlock(user.id);
  if (blocked) return { ok: false, error: blocked };
  const wait = await takeReadSlot(user.id, "coupang_settlement_read", REVENUE_READ_GAP_SECONDS);
  if (wait > 0) return { ok: false, error: `조금 전에 불러왔습니다. ${wait}초 뒤에 다시 눌러 주세요.` };
  try {
    return { ok: true, rows: normalizeSettlements((await wingRequest(keys, "GET", SETTLEMENT_PATH, { query: settlementQuery(month) })).data) };
  } catch (e) {
    return { ok: false, error: `지급내역을 읽지 못했습니다: ${wingMsg(e)}` };
  }
}

/** 재고 소진 예측용 현재 재고. 판매된 옵션만, 많이 팔린 순으로 넘겨받아 최대 20개(옵션당 읽기 1회) */
export async function loadStocksAction(vendorItemIds: number[]): Promise<{ ok: true; stocks: Record<string, number>; failed: number } | { ok: false; error: string }> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: NO_KEYS };
  const blocked = await callBudgetBlock(user.id);
  if (blocked) return { ok: false, error: blocked };
  const ids = (Array.isArray(vendorItemIds) ? vendorItemIds : []).map(Number).filter((x) => Number.isInteger(x) && x > 0).slice(0, RUNOUT_MAX_OPTIONS);
  const stocks: Record<string, number> = {};
  let failed = 0;
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(3, ids.length) }, async () => {
    while (next < ids.length) {
      const id = ids[next++];
      try {
        const inv = normalizeInventory((await wingRequest(keys, "GET", inventoryPath(id))).data);
        if (inv) stocks[String(id)] = inv.stock;
        else failed++;
      } catch {
        failed++;
      }
    }
  }));
  return { ok: true, stocks, failed };
}
