"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { normalizeOrderSheets, ordersPath, ordersQuery } from "@/lib/coupang/orders";
import { historyPath, normalizeHistorySteps, STALE_READ_GAP_SECONDS, staleShipments, type HistoryStep, type StaleShipment } from "@/lib/coupang/shipping";
import { callBudgetBlock } from "@/lib/coupang/usage";
import { takeReadSlot } from "@/lib/readGap";

export type StaleResult = { ok: true; rows: StaleShipment[]; more: boolean } | { ok: false; error: string };
const NO_KEYS = "먼저 「쿠팡 연결」에서 키를 등록해 주세요.";
const wingMsg = (e: unknown) => (e instanceof WingApiError ? e.message : "연결 오류");
const kstDay = (back: number) => new Date(Date.now() + 9 * 3_600_000 - back * 86_400_000).toISOString().slice(0, 10);

/** 배송지시·배송중 주문 최근 31일 첫 쪽(읽기 2회). 주문번호·상품·송장만 돌려주고 수취인 정보는 넘기지 않는다 */
export async function listStaleShipmentsAction(): Promise<StaleResult> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: NO_KEYS };
  const blocked = await callBudgetBlock(user.id);
  if (blocked) return { ok: false, error: blocked };
  const wait = await takeReadSlot(user.id, "coupang_stale_read", STALE_READ_GAP_SECONDS);
  if (wait > 0) return { ok: false, error: `조금 전에 확인했습니다. ${wait}초 뒤에 다시 눌러 주세요.` };
  try {
    const read = async (status: string) => normalizeOrderSheets((await wingRequest(keys, "GET", ordersPath(keys.vendorId), { query: ordersQuery({ from: kstDay(30), to: kstDay(0), status }) })).data);
    const [a, b] = await Promise.all([read("DEPARTURE"), read("DELIVERING")]);
    return { ok: true, rows: staleShipments([...a.orders, ...b.orders], Date.now()), more: !!a.nextToken || !!b.nextToken };
  } catch (e) {
    return { ok: false, error: `배송 중인 주문을 읽지 못했습니다: ${wingMsg(e)}` };
  }
}

/** 한 건의 배송 상태 변경 이력(읽기 1회) */
export async function shipmentHistoryAction(shipmentBoxId: number): Promise<{ ok: true; steps: HistoryStep[] } | { ok: false; error: string }> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: NO_KEYS };
  const id = Number(shipmentBoxId);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "배송번호가 올바르지 않습니다." };
  try {
    return { ok: true, steps: normalizeHistorySteps((await wingRequest(keys, "GET", historyPath(keys.vendorId, id))).data) };
  } catch (e) {
    return { ok: false, error: `배송 이력을 읽지 못했습니다: ${wingMsg(e)}` };
  }
}
