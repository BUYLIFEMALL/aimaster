"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateInvoiceEmail } from "@/lib/taxInvoice";

export type PlaceOrderState = { error: string | null; depositor: string; memo: string };

// 금액·재고·외상 한도는 DB 함수 mall_builder_place_order_v2(0038, 쿠폰·포인트 포함)가 다시 계산·검사한다(화면 금액은 「확인용」으로만 보낸다)
// 장바구니 비우기는 함수 밖에서 손님 권한으로 한다 — DB 함수에 지우기를 넣으면 적용 확인 창이 막힘(docs/mall/LESSONS_LEARNED.md)
export async function placeOrderAction(slug: string, _prev: PlaceOrderState, form: FormData): Promise<PlaceOrderState> {
  const values = { depositor: String(form.get("depositor") ?? ""), memo: String(form.get("memo") ?? "") };
  const addressId = String(form.get("address_id") ?? "");
  const expected = Number(form.get("expected_total"));
  const raw = form.get("pay_method");
  const payMethod = raw === "credit" ? "credit" : raw === "card" ? "card" : "bank";
  if (!addressId) return { ...values, error: "배송지를 골라 주세요." };
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) return { ...values, error: "몰을 찾을 수 없습니다." };
  // 쿠폰·포인트(D17·D18): 화면 값은 고른 것만 넘기고 할인액은 DB 함수가 다시 계산·검사한다
  const couponIssueId = String(form.get("coupon_issue_id") ?? "") || null;
  const points = Math.max(0, Math.floor(Number(form.get("points") ?? 0)) || 0);
  const { data, error } = await supabase.rpc("mall_builder_place_order_v2", {
    p_store_id: store.id,
    p_address_id: addressId,
    p_depositor: values.depositor,
    p_memo: values.memo,
    p_expected_total: Number.isFinite(expected) ? expected : -1,
    p_pay_method: payMethod,
    p_coupon_issue_id: couponIssueId,
    p_points: points,
  });
  if (error) return { ...values, error: error.message };
  const row = (data as { order_id: string; order_no: string }[] | null)?.[0];
  if (!row) return { ...values, error: "주문을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) await supabase.from("mall_builder_cart_items").delete().eq("store_id", store.id).eq("user_id", auth.user.id);
  // 세금계산서 요청(체크했으면) — 주문은 이미 됐으므로 실패해도 주문 상세에서 다시 요청할 수 있게 안내만
  let invoiceError = "";
  // 카드 결제는 카드 매출전표가 세금계산서를 대신하므로 요청하지 않는다(D19)
  if (form.get("want_invoice") === "on" && payMethod !== "card") {
    const email = validateInvoiceEmail(form.get("invoice_email"));
    const res = email.ok ? await supabase.rpc("mall_builder_request_tax_invoice", { p_order_id: row.order_id, p_email: email.value }) : null;
    invoiceError = !email.ok ? email.error : res?.error?.message ?? "";
  }
  revalidatePath(`/s/${slug}`, "layout");
  // 카드 주문은 결제 화면으로(토스 결제위젯). 결제가 끝나야 결제 완료가 된다
  if (payMethod === "card") redirect(`/s/${slug}/orders/${row.order_id}/pay${invoiceError ? `?error=${encodeURIComponent(`세금계산서 요청 실패: ${invoiceError}`)}` : ""}`);
  if (invoiceError) redirect(`/s/${slug}/orders/${row.order_id}?done=1&error=${encodeURIComponent(`세금계산서 요청 실패: ${invoiceError}`)}`);
  redirect(`/s/${slug}/orders/${row.order_id}?done=1`);
}
