"use server";

// M2-12b 교환 서버 동작 — 로그인 세션으로 DB 함수(0102)를 부른다. 권한·기간·수량·재고·결제·주문 상태 검사는 DB가 다시 한다.
// 여기서 더 하는 것: 입력 정리, 「이 교환/상품 줄이 주소의 몰 것인지」 서버 확인, 되돌아갈 주소를 같은 몰 경로로 제한.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE, parseExchangeFee, parseExchangeQty, safeBackPath } from "@/lib/exchanges";

type Supa = Awaited<ReturnType<typeof createClient>>;

function finish(slug: string, path: string, error: { message: string } | null, msg: string): never {
  revalidatePath(`/s/${slug}`, "layout");
  const safe = safeBackPath(slug, path);
  redirect(error ? `${safe}?error=${encodeURIComponent(error.message)}` : `${safe}?ok=1&msg=${encodeURIComponent(msg)}`);
}

async function storeIdOf(supabase: Supa, slug: string): Promise<string | null> {
  const { data } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** 상품 줄이 이 몰 주문의 것인지(본인 주문 유저·주문 권한 직원만 읽힘) */
async function itemInStore(supabase: Supa, slug: string, itemId: string): Promise<boolean> {
  if (!UUID_RE.test(itemId)) return false;
  const storeId = await storeIdOf(supabase, slug);
  if (!storeId) return false;
  const { data: item } = await supabase.from("mall_builder_order_items").select("order_id").eq("id", itemId).maybeSingle();
  if (!item) return false;
  const { data: order } = await supabase.from("mall_builder_orders").select("store_id").eq("id", item.order_id as string).maybeSingle();
  return order?.store_id === storeId;
}

/** 교환이 이 몰의 것인지(주문 권한 직원·본인 주문 유저만 읽힘) */
async function exchangeInStore(supabase: Supa, slug: string, exchangeId: string): Promise<boolean> {
  if (!UUID_RE.test(exchangeId)) return false;
  const storeId = await storeIdOf(supabase, slug);
  if (!storeId) return false;
  const { data } = await supabase.from("mall_builder_exchanges").select("store_id").eq("id", exchangeId).maybeSingle();
  return data?.store_id === storeId;
}

const NOT_FOUND = { message: "교환할 주문 상품을 찾을 수 없습니다." };
const EX_NOT_FOUND = { message: "교환을 찾을 수 없습니다." };

/** 유저·직원(대리): 교환 신청 — 상품 줄·수량·바꿀 옵션·사유·메모 */
export async function requestExchangeAction(slug: string, backPath: string, form: FormData) {
  const supabase = await createClient();
  const itemId = String(form.get("item_id") ?? "");
  if (!(await itemInStore(supabase, slug, itemId))) finish(slug, backPath, NOT_FOUND, "");
  const qty = parseExchangeQty(form.get("qty"));
  if (qty === null) finish(slug, backPath, { message: "교환 수량을 1개 이상으로 넣어 주세요." }, "");
  const to = String(form.get("to_variant_id") ?? "");
  const { error } = await supabase.rpc("mall_builder_request_exchange", {
    p_item_id: itemId,
    p_qty: qty,
    p_to_variant_id: UUID_RE.test(to) ? to : null,
    p_reason: String(form.get("reason") ?? ""),
    p_memo: String(form.get("memo") ?? "").slice(0, 300),
  });
  finish(slug, backPath, error, "교환을 신청했습니다. 쇼핑몰이 회수를 안내합니다.");
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
export async function exchangeStepAction(slug: string, exchangeId: string, backPath: string, step: StaffStep, form: FormData) {
  if (!Object.hasOwn(STEP_MSG, step)) finish(slug, backPath, { message: "교환 단계가 올바르지 않습니다." }, "");
  const supabase = await createClient();
  if (!(await exchangeInStore(supabase, slug, exchangeId))) finish(slug, backPath, EX_NOT_FOUND, "");
  const { error } = await supabase.rpc("mall_builder_exchange_step", {
    p_exchange_id: exchangeId,
    p_step: step,
    p_courier: String(form.get("courier") ?? "").slice(0, 30),
    p_tracking: String(form.get("tracking") ?? "").slice(0, 40),
    p_note: String(form.get("note") ?? "").slice(0, 300),
  });
  finish(slug, backPath, error, STEP_MSG[step]);
}

/** 운영사: 교환비 금액 정하기(재발송 전·결제 전) */
export async function exchangeFeeAction(slug: string, exchangeId: string, backPath: string, form: FormData) {
  const fee = parseExchangeFee(form.get("fee"));
  if (fee === null) finish(slug, backPath, { message: "교환비는 0원 이상 1,000만 원 이하 숫자로 넣어 주세요." }, "");
  const supabase = await createClient();
  if (!(await exchangeInStore(supabase, slug, exchangeId))) finish(slug, backPath, EX_NOT_FOUND, "");
  const { error } = await supabase.rpc("mall_builder_exchange_fee", { p_exchange_id: exchangeId, p_fee: fee });
  finish(slug, backPath, error, fee ? `교환비를 ${fee.toLocaleString("ko-KR")}원으로 정했습니다.` : "교환비를 없앴습니다.");
}

/** 운영사: 교환비 무통장 입금 확인 */
export async function exchangeFeePaidAction(slug: string, exchangeId: string, backPath: string) {
  const supabase = await createClient();
  if (!(await exchangeInStore(supabase, slug, exchangeId))) finish(slug, backPath, EX_NOT_FOUND, "");
  const { error } = await supabase.rpc("mall_builder_exchange_fee_paid", { p_exchange_id: exchangeId });
  finish(slug, backPath, error, "교환비 입금을 확인했습니다. 이제 새 상품을 보낼 수 있습니다.");
}
