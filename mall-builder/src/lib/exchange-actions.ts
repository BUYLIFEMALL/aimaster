"use server";

// M2-12b 교환 서버 동작 — 로그인 세션으로 DB 함수(0102)를 부른다. 권한·기간·수량·재고·결제·주문 상태 검사는 DB가 다시 한다.
// 여기서 더 하는 것: 입력 정리, 「이 교환/상품 줄이 주소의 몰 것인지」 서버 확인, 돌아갈 주소는 입력을 받지 않고
// 몰 이름 형식 + 서버에서 확인한 주문 번호로 새로 만든다(QA-20261117-006 — 인코딩된 ../ 등 우회 차단).
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STORE_SLUG_RE, UUID_RE, exchangeReturnPath, parseExchangeFee, parseExchangeQty } from "@/lib/exchanges";

type Supa = Awaited<ReturnType<typeof createClient>>;
type View = "admin" | "shop";

function finish(slug: string, view: View, orderId: string | null, error: { message: string } | null, msg: string): never {
  const path = exchangeReturnPath(slug, view === "admin" ? "admin" : "shop", orderId);
  if (STORE_SLUG_RE.test(slug)) revalidatePath(`/s/${slug}`, "layout");
  redirect(error ? `${path}?error=${encodeURIComponent(error.message)}` : `${path}?ok=1&msg=${encodeURIComponent(msg)}`);
}

async function storeIdOf(supabase: Supa, slug: string): Promise<string | null> {
  if (!STORE_SLUG_RE.test(slug)) return null;
  const { data } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** 상품 줄이 이 몰 주문의 것이면 그 주문 번호(본인 주문 유저·주문 권한 직원만 읽힘), 아니면 null */
async function itemOrderInStore(supabase: Supa, slug: string, itemId: string): Promise<string | null> {
  if (!UUID_RE.test(itemId)) return null;
  const storeId = await storeIdOf(supabase, slug);
  if (!storeId) return null;
  const { data: item } = await supabase.from("mall_builder_order_items").select("order_id").eq("id", itemId).maybeSingle();
  if (!item) return null;
  const { data: order } = await supabase.from("mall_builder_orders").select("id, store_id").eq("id", item.order_id as string).maybeSingle();
  return order?.store_id === storeId ? (order.id as string) : null;
}

/** 교환이 이 몰의 것이면 그 주문 번호(주문 권한 직원·본인 주문 유저만 읽힘), 아니면 null */
async function exchangeOrderInStore(supabase: Supa, slug: string, exchangeId: string): Promise<string | null> {
  if (!UUID_RE.test(exchangeId)) return null;
  const storeId = await storeIdOf(supabase, slug);
  if (!storeId) return null;
  const { data } = await supabase.from("mall_builder_exchanges").select("order_id, store_id").eq("id", exchangeId).maybeSingle();
  return data?.store_id === storeId ? (data.order_id as string) : null;
}

const NOT_FOUND = { message: "교환할 주문 상품을 찾을 수 없습니다." };
const EX_NOT_FOUND = { message: "교환을 찾을 수 없습니다." };

/** 유저(view=shop)·직원 대리(view=admin): 교환 신청 — 상품 줄·수량·바꿀 옵션·사유·메모 */
export async function requestExchangeAction(slug: string, view: View, form: FormData) {
  const supabase = await createClient();
  const itemId = String(form.get("item_id") ?? "");
  const orderId = await itemOrderInStore(supabase, slug, itemId);
  if (!orderId) finish(slug, view, null, NOT_FOUND, "");
  const qty = parseExchangeQty(form.get("qty"));
  if (qty === null) finish(slug, view, orderId, { message: "교환 수량을 1개 이상으로 넣어 주세요." }, "");
  const to = String(form.get("to_variant_id") ?? "");
  const { error } = await supabase.rpc("mall_builder_request_exchange", {
    p_item_id: itemId,
    p_qty: qty,
    p_to_variant_id: UUID_RE.test(to) ? to : null,
    p_reason: String(form.get("reason") ?? ""),
    p_memo: String(form.get("memo") ?? "").slice(0, 300),
  });
  finish(slug, view, orderId, error, "교환을 신청했습니다. 쇼핑몰이 회수를 안내합니다.");
}

const STEP_MSG = {
  collecting: "회수 중으로 바꿨습니다.",
  collected: "회수 완료(입고)로 바꿨습니다.",
  reshipped: "새 상품 발송으로 바꿨습니다.",
  done: "교환 완료로 바꿨습니다.",
  rejected: "교환을 거절했습니다.",
} as const;
type StaffStep = keyof typeof STEP_MSG;

/** 운영사: 교환 단계 바꾸기(회수 송장·재발송 송장·거절 사유) */
export async function exchangeStepAction(slug: string, exchangeId: string, step: StaffStep, form: FormData) {
  const supabase = await createClient();
  const orderId = await exchangeOrderInStore(supabase, slug, exchangeId);
  if (!orderId) finish(slug, "admin", null, EX_NOT_FOUND, "");
  if (!Object.hasOwn(STEP_MSG, step)) finish(slug, "admin", orderId, { message: "교환 단계가 올바르지 않습니다." }, "");
  const { error } = await supabase.rpc("mall_builder_exchange_step", {
    p_exchange_id: exchangeId,
    p_step: step,
    p_courier: String(form.get("courier") ?? "").slice(0, 30),
    p_tracking: String(form.get("tracking") ?? "").slice(0, 40),
    p_note: String(form.get("note") ?? "").slice(0, 300),
  });
  finish(slug, "admin", orderId, error, STEP_MSG[step]);
}

/** 운영사: 교환비 금액 정하기(재발송 전·결제 전) */
export async function exchangeFeeAction(slug: string, exchangeId: string, form: FormData) {
  const supabase = await createClient();
  const orderId = await exchangeOrderInStore(supabase, slug, exchangeId);
  if (!orderId) finish(slug, "admin", null, EX_NOT_FOUND, "");
  const fee = parseExchangeFee(form.get("fee"));
  if (fee === null) finish(slug, "admin", orderId, { message: "교환비는 0원 이상 1,000만 원 이하 숫자로 넣어 주세요." }, "");
  const { error } = await supabase.rpc("mall_builder_exchange_fee", { p_exchange_id: exchangeId, p_fee: fee });
  finish(slug, "admin", orderId, error, fee ? `교환비를 ${fee.toLocaleString("ko-KR")}원으로 정했습니다.` : "교환비를 없앴습니다.");
}

/**
 * 운영사: 교환비 카드 결제를 토스에서 다시 확인(0104 card_recheck). 몰 소속 확인을 rpc보다 먼저.
 * 결과·오류는 우리 고정 문구로만 — DB·토스 응답 원문을 주소에 넣지 않는다(결제 키·원문 비노출).
 */
export async function exchangeFeeCardRecheckAction(slug: string, exchangeId: string) {
  const supabase = await createClient();
  const orderId = await exchangeOrderInStore(supabase, slug, exchangeId);
  if (!orderId) finish(slug, "admin", null, EX_NOT_FOUND, "");
  const { data, error } = await supabase.rpc("mall_builder_exchange_fee_card_recheck", { p_exchange_id: exchangeId });
  if (error) finish(slug, "admin", orderId, { message: "카드 결제를 다시 확인하지 못했습니다. 상태는 그대로 두었습니다. 잠시 뒤 다시 눌러 주세요." }, "");
  const r = (data ?? {}) as { held?: unknown; mismatch?: unknown; needs_review?: unknown; released?: unknown; error?: unknown };
  const msg = r.held === true ? "토스에서 취소된 결제로 확인되어 보류했습니다. 쇼핑몰 관리자(대표 운영사) 확인이 필요합니다."
    : r.mismatch === true || r.needs_review === true || typeof r.error === "string" ? "결제 정보가 맞지 않거나 확인하지 못해 「확인 필요」로 남겼습니다(재발송 잠김)."
    : "카드 결제를 다시 확인했습니다.";
  finish(slug, "admin", orderId, null, msg);
}

/** 운영사: 교환비 무통장 입금 확인 */
export async function exchangeFeePaidAction(slug: string, exchangeId: string) {
  const supabase = await createClient();
  const orderId = await exchangeOrderInStore(supabase, slug, exchangeId);
  if (!orderId) finish(slug, "admin", null, EX_NOT_FOUND, "");
  const { error } = await supabase.rpc("mall_builder_exchange_fee_paid", { p_exchange_id: exchangeId });
  finish(slug, "admin", orderId, error, "교환비 입금을 확인했습니다. 이제 새 상품을 보낼 수 있습니다.");
}
