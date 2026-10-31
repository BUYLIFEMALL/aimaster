"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { LIST_PATH, listQuery, normalizeProductList, type ListedProduct } from "@/lib/coupang/listing";

export type ListResult = { ok: true; items: ListedProduct[]; nextToken: string } | { ok: false; error: string };

/** C2-1 내 쿠팡 상품 목록(회원 본인 키, 읽기만) */
export async function listMyCoupangProductsAction(opt: { nextToken?: string; status?: string; name?: string }): Promise<ListResult> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요." };
  try {
    const r = await wingRequest(keys, "GET", LIST_PATH, { query: listQuery(keys.vendorId, opt) });
    return { ok: true, ...normalizeProductList(r.data) };
  } catch (e) {
    return { ok: false, error: `쿠팡 상품 목록을 읽지 못했습니다: ${e instanceof WingApiError ? e.message : "연결 오류"}` };
  }
}
