"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
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
