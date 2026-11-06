"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_ANSWER, MAX_REPLY, validateAnswer, validateFaq, validateInquiry, validateReview, type InquiryKind } from "@/lib/reviews";

// 후기·문의·FAQ(D13) 서버 동작 — 권한·상태 검사는 DB 함수(0033)가 한다. 결과는 돌아갈 화면의 ?error= / ?ok=&msg= 로 보여 준다

function go(path: string, error?: string | null, ok?: string): never {
  const q = error ? `error=${encodeURIComponent(error)}` : `ok=1&msg=${encodeURIComponent(ok ?? "처리했습니다.")}`;
  redirect(`${path}${path.includes("?") ? "&" : "?"}${q}`);
}

/** 손님: 후기 쓰기·고치기(주문 상세 품목) */
export async function writeReviewAction(slug: string, orderId: string, orderItemId: string, form: FormData) {
  const back = `/s/${slug}/orders/${orderId}`;
  const v = validateReview({ rating: form.get("rating"), body: form.get("body") });
  if (!v.ok) go(back, v.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_review_write", { p_order_item_id: orderItemId, p_rating: v.value.rating, p_body: v.value.body });
  revalidatePath(`/s/${slug}`, "layout");
  go(back, error?.message, "후기를 남겼습니다.");
}

/** 손님: 후기 지우기 */
export async function removeReviewAction(slug: string, backPath: string, reviewId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_review_remove", { p_review_id: reviewId });
  revalidatePath(`/s/${slug}`, "layout");
  go(backPath, error?.message, "후기를 지웠습니다.");
}

/** 손님: 상품 문의 / 1:1 문의 쓰기 */
export async function writeInquiryAction(slug: string, storeId: string, kind: InquiryKind, productId: string | null, backPath: string, form: FormData) {
  const v = validateInquiry({ title: form.get("title"), body: form.get("body"), secret: form.get("secret") });
  if (!v.ok) go(backPath, v.error);
  const orderId = String(form.get("order_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_inquiry_write", {
    p_store_id: storeId, p_kind: kind, p_product_id: productId, p_order_id: /^[0-9a-f-]{36}$/.test(orderId) ? orderId : null,
    p_title: v.value.title, p_body: v.value.body, p_secret: v.value.is_secret,
  });
  revalidatePath(`/s/${slug}`, "layout");
  go(backPath, error?.message, "문의를 남겼습니다. 답변이 달리면 이 자리에 보입니다.");
}

/** 손님: 문의 고치기(답변 전만) */
export async function editInquiryAction(slug: string, backPath: string, inquiryId: string, form: FormData) {
  const v = validateInquiry({ title: form.get("title"), body: form.get("body"), secret: form.get("secret") });
  if (!v.ok) go(backPath, v.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_inquiry_edit", { p_inquiry_id: inquiryId, p_title: v.value.title, p_body: v.value.body, p_secret: v.value.is_secret });
  revalidatePath(`/s/${slug}`, "layout");
  go(backPath, error?.message, "문의를 고쳤습니다.");
}

/** 손님: 문의 지우기 */
export async function removeInquiryAction(slug: string, backPath: string, inquiryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_inquiry_remove", { p_inquiry_id: inquiryId });
  revalidatePath(`/s/${slug}`, "layout");
  go(backPath, error?.message, "문의를 지웠습니다.");
}

// ── 운영자 ──

/** 운영자: 후기 답글·숨기기 */
export async function moderateReviewAction(slug: string, reviewId: string, form: FormData) {
  const back = `/s/${slug}/admin/reviews`;
  const v = validateAnswer(form.get("reply"), MAX_REPLY);
  if (!v.ok) go(back, v.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_review_moderate", { p_review_id: reviewId, p_reply: v.value, p_hidden: form.get("hidden") === "on" });
  revalidatePath(`/s/${slug}`, "layout");
  go(back, error?.message, "후기를 처리했습니다.");
}

/** 운영자: 문의 답변·숨기기 */
export async function answerInquiryAction(slug: string, inquiryId: string, form: FormData) {
  const back = `/s/${slug}/admin/inquiries`;
  const v = validateAnswer(form.get("answer"), MAX_ANSWER);
  if (!v.ok) go(back, v.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_inquiry_answer", { p_inquiry_id: inquiryId, p_answer: v.value, p_hidden: form.get("hidden") === "on" });
  revalidatePath(`/s/${slug}`, "layout");
  go(back, error?.message, v.value ? "답변을 달았습니다." : "처리했습니다.");
}

async function staffStore(slug: string, back: string) {
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) go(back, "몰을 찾을 수 없습니다.");
  const { data: staff } = await supabase.rpc("mall_builder_is_store_staff", { p_store_id: store.id });
  if (staff !== true) go(back, "이 몰을 고칠 권한이 없습니다.");
  return { supabase, storeId: store.id as string };
}

/** 운영자: FAQ 쓰기·고치기(표 규칙으로 — 그 몰 운영자만) */
export async function saveFaqAction(slug: string, faqId: string | null, form: FormData) {
  const back = `/s/${slug}/admin/faq`;
  const v = validateFaq({ category: form.get("category"), question: form.get("question"), answer: form.get("answer"), sort: form.get("sort"), published: form.get("published") });
  if (!v.ok) go(back, v.error);
  const { supabase, storeId } = await staffStore(slug, back);
  const { error } = faqId
    ? await supabase.from("mall_builder_faqs").update({ ...v.value, updated_at: new Date().toISOString() }).eq("id", faqId).eq("store_id", storeId)
    : await supabase.from("mall_builder_faqs").insert({ ...v.value, store_id: storeId });
  revalidatePath(`/s/${slug}`, "layout");
  go(back, error?.message, faqId ? "FAQ를 고쳤습니다." : "FAQ를 올렸습니다.");
}

export async function deleteFaqAction(slug: string, faqId: string) {
  const back = `/s/${slug}/admin/faq`;
  const { supabase, storeId } = await staffStore(slug, back);
  const { error } = await supabase.from("mall_builder_faqs").delete().eq("id", faqId).eq("store_id", storeId);
  revalidatePath(`/s/${slug}`, "layout");
  go(back, error?.message, "FAQ를 삭제했습니다.");
}
