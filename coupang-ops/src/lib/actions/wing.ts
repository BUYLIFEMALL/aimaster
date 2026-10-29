"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { PREDICT_PATH, metaPath, normalizeMeta, normalizePredict, predictBody, type CategoryMeta, type PredictResult } from "@/lib/coupang/category";
import { OUTBOUND_PATH, normalizeOutbound, normalizeReturnCenters, returnCentersPath, type OutboundPlace, type ReturnCenter } from "@/lib/coupang/logistics";

export type ConnectionResult =
  | { ok: true; places: OutboundPlace[]; centers: ReturnCenter[]; warnings: string | null; checkedAt: string }
  | { ok: false; error: string; step: "keys" | "outbound" | "return" };

/** C1-4 연결 시험 = 출고지 조회(키·IP 확인) + 반품지 조회. 읽기만 하고 쿠팡에 아무것도 만들지 않는다. */
export async function testWingConnectionAction(): Promise<ConnectionResult> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, step: "keys", error: "먼저 쿠팡 키 4개를 저장해 주세요." };
  const query = new URLSearchParams({ pageNum: "1", pageSize: "50" });
  let places: OutboundPlace[] = [];
  let warnings: string | null = null;
  try {
    const r = await wingRequest(keys, "GET", OUTBOUND_PATH, { query });
    places = normalizeOutbound(r.data).places;
    warnings = r.warnings;
  } catch (e) {
    return { ok: false, step: "outbound", error: e instanceof WingApiError ? e.message : "쿠팡에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
  try {
    const r = await wingRequest(keys, "GET", returnCentersPath(keys.vendorId), { query });
    return { ok: true, places, centers: normalizeReturnCenters(r.data).centers, warnings: warnings ?? r.warnings, checkedAt: new Date().toISOString() };
  } catch (e) {
    return { ok: false, step: "return", error: `키와 IP는 맞습니다(출고지 ${places.length}곳 확인). 반품지 조회만 실패했습니다: ${e instanceof WingApiError ? e.message : "연결 오류"}` };
  }
}

export type CategoryCheckResult =
  | { ok: true; predict: PredictResult; meta: CategoryMeta | null; metaError: string | null }
  | { ok: false; error: string };

/** C1-7·C1-8 실제 응답 확인 — 상품명으로 카테고리 추천을 받고 그 카테고리 메타를 읽는다. 쿠팡에 아무것도 만들지 않는다. */
export async function checkCategoryAction(name: string): Promise<CategoryCheckResult> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: "먼저 쿠팡 키 4개를 저장해 주세요." };
  if (!name.trim()) return { ok: false, error: "상품명을 넣어 주세요." };
  let predict: PredictResult;
  try {
    const r = await wingRequest(keys, "POST", PREDICT_PATH, { body: predictBody({ name }) });
    predict = normalizePredict(r.data);
  } catch (e) {
    return { ok: false, error: `카테고리 추천 실패: ${e instanceof WingApiError ? e.message : "연결 오류"}` };
  }
  if (!predict.ok) return { ok: true, predict, meta: null, metaError: null };
  try {
    const r = await wingRequest(keys, "GET", metaPath(predict.code));
    return { ok: true, predict, meta: normalizeMeta(r.data), metaError: null };
  } catch (e) {
    return { ok: true, predict, meta: null, metaError: e instanceof WingApiError ? e.message : "연결 오류" };
  }
}

export type RemoteFeeResult = { ok: true; jeju: number; notJeju: number; courier: string } | { ok: false; error: string };

/** 출고지의 제주·도서산간 추가배송비를 WING에 저장한다(쿠팡 설정을 바꿈). 기존 주소·항목 번호를 다시 읽어 그대로 보낸 뒤, 다시 읽어 확인한다.
 *  명세: https://developers.coupang.com/ko/api/logistics/update-a-shipping-location — 0원 또는 1,000~8,000원(100원 단위) */
export async function updateRemoteFeeAction(placeCode: string, jeju: number, notJeju: number): Promise<RemoteFeeResult> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: "먼저 쿠팡 키를 저장해 주세요." };
  const okFee = (n: number) => Number.isInteger(n) && (n === 0 || (n >= 1000 && n <= 8000 && n % 100 === 0));
  if (!okFee(jeju) || !okFee(notJeju)) return { ok: false, error: "추가배송비는 0원 또는 1,000~8,000원(100원 단위)이어야 합니다(쿠팡 규칙)." };
  type RawPlace = { outboundShippingPlaceCode?: unknown; shippingPlaceName?: unknown; usable?: unknown; global?: unknown; placeAddresses?: Record<string, unknown>[]; remoteInfos?: { remoteInfoId?: unknown; deliveryCode?: unknown; usable?: unknown }[] };
  const readPlace = async (): Promise<RawPlace | undefined> => {
    const r = await wingRequest(keys, "GET", OUTBOUND_PATH, { query: new URLSearchParams({ pageNum: "1", pageSize: "50" }) });
    const root = (r.data ?? {}) as { content?: RawPlace[]; data?: { content?: RawPlace[] } };
    return (root.content ?? root.data?.content ?? []).find((p) => String(p.outboundShippingPlaceCode) === placeCode);
  };
  try {
    const place = await readPlace();
    if (!place) return { ok: false, error: `출고지 ${placeCode}를 찾지 못했습니다.` };
    const remotes = (place.remoteInfos ?? []).filter((x) => x.usable !== false && x.remoteInfoId);
    if (!remotes.length) return { ok: false, error: (place.remoteInfos ?? []).length ? "쿠팡 출고지 조회 응답에 추가배송비 항목 번호(remoteInfoId)가 비어 있어 API로 바꿀 수 없습니다. WING 「출고지 관리」에서 직접 바꿔 주세요(바꾼 뒤 「연결 시험」으로 확인)." : "이 출고지에 택배사별 추가배송비 항목이 없습니다. WING에서 먼저 택배사를 등록해 주세요." };
    const pick = ["addressType", "countryCode", "companyContactNumber", "phoneNumber2", "returnZipCode", "returnAddress", "returnAddressDetail"];
    const body = {
      vendorId: keys.vendorId,
      userId: keys.wingUserId,
      outboundShippingPlaceCode: Number(placeCode),
      shippingPlaceName: String(place.shippingPlaceName ?? ""),
      usable: place.usable !== false,
      global: place.global === true,
      placeAddresses: (place.placeAddresses ?? []).map((a) => Object.fromEntries(pick.filter((k) => a[k] != null && a[k] !== "").map((k) => [k, a[k]]))),
      remoteInfos: remotes.map((x) => ({ remoteInfoId: Number(x.remoteInfoId), deliveryCode: String(x.deliveryCode ?? ""), jeju, notJeju, usable: true })),
    };
    await wingRequest(keys, "PUT", `/v2/providers/openapi/apis/api/v5/vendors/${encodeURIComponent(keys.vendorId)}/outboundShippingCenters/${encodeURIComponent(placeCode)}`, { body });
    const after = (await readPlace())?.remoteInfos?.find((x) => x.usable !== false) as { deliveryCode?: unknown; jeju?: unknown; notJeju?: unknown } | undefined;
    return { ok: true, jeju: Number(after?.jeju) || 0, notJeju: Number(after?.notJeju) || 0, courier: String(after?.deliveryCode ?? "") };
  } catch (e) {
    return { ok: false, error: e instanceof WingApiError ? e.message : "쿠팡에 연결하지 못했습니다." };
  }
}
