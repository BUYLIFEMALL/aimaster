"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { budgetPath, checkCoupon, contractsPath, COUPON_READ_GAP_SECONDS, couponBody, createPath, expirePath, itemsPath, listPath, MAX_COUPON_ITEMS, normalizeBudget, normalizeContracts, normalizeCoupons, normalizeRequest, requestedIdOf, requestedPath, type Contract, type Coupon, type CouponDraft, type RequestState } from "@/lib/coupang/coupons";
import { takeReadSlot } from "@/lib/readGap";

type Fail = { ok: false; error: string };
const NO_KEYS: Fail = { ok: false, error: "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요." };
const fail = (e: unknown, what: string): Fail => ({ ok: false, error: `${what}: ${e instanceof WingApiError ? e.message : "연결 오류 — WING에서 확인해 주세요."}` });

async function ctx() {
  const user = await requireProgramAccess();
  return { user, keys: await getWingKeys(user.id) };
}
const today = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

export async function loadCouponsAction(status: string): Promise<{ ok: true; contracts: Contract[]; coupons: Coupon[] } | Fail> {
  const { user, keys } = await ctx();
  if (!keys) return NO_KEYS;
  const wait = await takeReadSlot(user.id, "coupang_coupon_read", COUPON_READ_GAP_SECONDS);
  if (wait > 0) return { ok: false, error: `조금 전에 불러왔습니다. ${wait}초 뒤에 다시 눌러 주세요.` };
  try {
    const [contracts, coupons] = await Promise.all([
      wingRequest(keys, "GET", contractsPath(keys.vendorId)),
      wingRequest(keys, "GET", listPath(keys.vendorId), { query: `status=${encodeURIComponent(status)}&page=1&size=50&sort=desc` }),
    ]);
    return { ok: true, contracts: normalizeContracts(contracts.data), coupons: normalizeCoupons(coupons.data) };
  } catch (e) {
    return fail(e, "쿠폰 정보를 읽지 못했습니다");
  }
}

export async function loadBudgetAction(contractId: number, month: string): Promise<{ ok: true; budget: { total: number; used: number } | null } | Fail> {
  const { keys } = await ctx();
  if (!keys) return NO_KEYS;
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "월 형식이 맞지 않습니다." };
  try {
    const r = await wingRequest(keys, "GET", budgetPath(keys.vendorId), { query: `contractId=${Number(contractId)}&targetMonth=${month}` });
    return { ok: true, budget: normalizeBudget(r.data) };
  } catch (e) {
    return fail(e, "예산을 읽지 못했습니다");
  }
}

/** 생성(비동기). 재시도 없음 — 응답을 못 받으면 중복될 수 있어 목록 확인을 안내한다 */
export async function createCouponAction(draft: CouponDraft): Promise<{ ok: true; requestedId: string } | Fail> {
  const { keys } = await ctx();
  if (!keys) return NO_KEYS;
  try {
    const contracts = normalizeContracts((await wingRequest(keys, "GET", contractsPath(keys.vendorId))).data);
    const problem = checkCoupon(draft, today(), contracts.find((c) => c.contractId === Number(draft.contractId)));
    if (problem) return { ok: false, error: problem };
    const r = await wingRequest(keys, "POST", createPath(keys.vendorId), { body: couponBody(draft) });
    const requestedId = requestedIdOf(r.data);
    if (!requestedId) return { ok: false, error: "쿠팡 응답에 요청 번호가 없습니다. 다시 보내기 전에 쿠폰 목록과 WING을 확인해 주세요." };
    return { ok: true, requestedId };
  } catch (e) {
    return fail(e, "쿠폰을 만들지 못했습니다. 다시 보내기 전에 쿠폰 목록을 확인해 주세요");
  }
}

export async function couponRequestAction(requestedId: string): Promise<{ ok: true; state: RequestState } | Fail> {
  const { keys } = await ctx();
  if (!keys) return NO_KEYS;
  try {
    return { ok: true, state: normalizeRequest((await wingRequest(keys, "GET", requestedPath(keys.vendorId, String(requestedId)))).data) };
  } catch (e) {
    return fail(e, "요청 상태를 읽지 못했습니다");
  }
}

export async function addCouponItemsAction(couponId: number, vendorItemIds: number[]): Promise<{ ok: true; requestedId: string } | Fail> {
  const { keys } = await ctx();
  if (!keys) return NO_KEYS;
  const ids = vendorItemIds.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length || ids.length > MAX_COUPON_ITEMS) return { ok: false, error: `옵션ID는 1~${MAX_COUPON_ITEMS}개로 넣어 주세요.` };
  try {
    const r = await wingRequest(keys, "POST", itemsPath(keys.vendorId, Number(couponId)), { body: { vendorItems: ids } });
    return { ok: true, requestedId: requestedIdOf(r.data) };
  } catch (e) {
    return fail(e, "옵션을 추가하지 못했습니다");
  }
}

export async function expireCouponAction(couponId: number): Promise<{ ok: true; requestedId: string } | Fail> {
  const { keys } = await ctx();
  if (!keys) return NO_KEYS;
  try {
    const r = await wingRequest(keys, "PUT", expirePath(keys.vendorId, Number(couponId)), { query: "action=expire" });
    return { ok: true, requestedId: requestedIdOf(r.data) };
  } catch (e) {
    return fail(e, "쿠폰을 파기하지 못했습니다");
  }
}
