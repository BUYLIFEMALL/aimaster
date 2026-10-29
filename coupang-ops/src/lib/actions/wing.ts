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
  | { ok: true; predict: PredictResult; meta: CategoryMeta | null; rawAttrKeys: string[]; metaError: string | null }
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
  if (!predict.ok) return { ok: true, predict, meta: null, rawAttrKeys: [], metaError: null };
  try {
    const r = await wingRequest(keys, "GET", metaPath(predict.code));
    const attrs = ((r.data as { data?: { attributes?: Record<string, unknown>[] } })?.data?.attributes ?? []);
    // 메타에 고를 수 있는 값 목록(inputValues 등)이 오는지 확인하려고 첫 속성의 칸 이름을 함께 돌려준다
    return { ok: true, predict, meta: normalizeMeta(r.data), rawAttrKeys: attrs[0] ? Object.keys(attrs[0]) : [], metaError: null };
  } catch (e) {
    return { ok: true, predict, meta: null, rawAttrKeys: [], metaError: e instanceof WingApiError ? e.message : "연결 오류" };
  }
}
