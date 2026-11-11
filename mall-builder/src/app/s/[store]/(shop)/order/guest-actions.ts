"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateGuestOrder } from "@/lib/guest";
import { readGuestCart, saveGuestToken, writeGuestCart } from "@/lib/guest-store";

export type GuestOrderState = { error: string | null; values: Record<string, string> };

const FIELDS = ["guest_name", "guest_phone", "guest_email", "receiver", "phone", "zip", "addr1", "addr2", "depositor", "memo"] as const;

// 비회원 주문(D15) — 쿠키 장바구니 줄을 그대로 DB 함수에 넘기고, 금액·재고·배송비·몰 설정은 함수가 다시 검사한다.
// 성공하면 장바구니 쿠키를 비우고 조회 토큰을 쿠키에 담아 주문 상세로 보낸다
export async function placeGuestOrderAction(slug: string, _prev: GuestOrderState, form: FormData): Promise<GuestOrderState> {
  const values = Object.fromEntries(FIELDS.map((k) => [k, String(form.get(k) ?? "")]));
  const v = validateGuestOrder(values);
  if (!v.ok) return { error: v.error, values };
  const expected = Number(form.get("expected_total"));
  const lines = await readGuestCart(slug);
  if (!lines.length) return { error: "장바구니가 비어 있습니다.", values };
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) return { error: "몰을 찾을 수 없습니다.", values };
  const { data, error } = await supabase.rpc("mall_builder_place_guest_order", {
    p_store_id: store.id,
    p_lines: lines.map((l) => ({ product_id: l.p, variant_id: l.v, qty: l.q })),
    p_guest: v.value.guest,
    p_receiver: v.value.receiver,
    p_depositor: v.value.depositor,
    p_memo: v.value.memo,
    p_expected_total: Number.isFinite(expected) ? expected : -1,
  });
  if (error) return { error: error.message, values };
  const row = data as { order_id: string; order_no: string; token: string } | null;
  if (!row?.order_id) return { error: "주문을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.", values };
  await writeGuestCart(slug, []);
  await saveGuestToken(slug, row.order_id, row.token);
  revalidatePath(`/s/${slug}`, "layout");
  redirect(`/s/${slug}/guest/orders/${row.order_id}?done=1`);
}
