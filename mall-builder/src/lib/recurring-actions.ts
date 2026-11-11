"use server";

// D30 정기 주문 서버 동작 — 권한·검사는 DB 함수(0050)가 다시 한다. 결과는 돌아갈 화면의 ?error= / ?ok=&msg= 로 보여 준다
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseSchedule, todayKst } from "@/lib/recurring";

function go(path: string, error?: string | null, ok?: string): never {
  const q = error ? `error=${encodeURIComponent(error)}` : `ok=1&msg=${encodeURIComponent(ok ?? "처리했습니다.")}`;
  redirect(`${path}${path.includes("?") ? "&" : "?"}${q}`);
}

async function storeId(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  return { supabase, id: (data?.id as string | undefined) ?? null };
}

/** 손님: 지난 주문으로 정기 주문 만들기 */
export async function createRecurringAction(slug: string, orderId: string, form: FormData) {
  const back = `/s/${slug}/orders/${orderId}`;
  const parsed = parseSchedule(
    { kind: form.get("kind"), weekday: form.get("weekday"), every_weeks: form.get("every_weeks"), month_day: form.get("month_day"), start: form.get("start") },
    todayKst(),
  );
  if (!parsed.ok) go(back, parsed.error);
  const { supabase, id } = await storeId(slug);
  if (!id) go(back, "몰을 찾을 수 없습니다.");
  const s = parsed.value;
  const { error } = await supabase.rpc("mall_builder_recurring_create", {
    p_store_id: id,
    p_order_id: orderId,
    p_kind: s.kind,
    p_weekday: s.weekday,
    p_every_weeks: s.every_weeks,
    p_month_day: s.month_day,
    p_start: parsed.start,
    p_pay_method: String(form.get("pay_method") ?? ""),
    p_address_id: String(form.get("address_id") ?? "") || null,
    p_depositor: String(form.get("depositor") ?? ""),
    p_memo: String(form.get("memo") ?? ""),
  });
  if (error) go(back, error.message);
  revalidatePath(`/s/${slug}/my/recurring`);
  go(`/s/${slug}/my/recurring`, null, "정기 주문을 만들었습니다. 주문일 아침에 자동으로 주문됩니다.");
}

/** 손님 본인·「주문」 권한 직원: 일시정지·다시 시작·건너뛰기·해지 */
export async function changeRecurringAction(slug: string, id: string, action: "pause" | "resume" | "skip" | "cancel", back: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_recurring_change", { p_id: id, p_action: action });
  const done = { pause: "일시정지했습니다.", resume: "다시 시작했습니다.", skip: "다음 한 번을 건너뜁니다.", cancel: "해지했습니다." }[action];
  revalidatePath(back);
  go(back, error?.message, done);
}

/** 수량 바꾸기(0이면 그 품목 빼기) */
export async function recurringQtyAction(slug: string, id: string, count: number, back: string, form: FormData) {
  const qtys = Array.from({ length: count }, (_, i) => Number(form.get(`qty_${i}`)));
  if (qtys.some((q) => !Number.isInteger(q))) go(back, "수량은 숫자로 입력해 주세요.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_recurring_change", { p_id: id, p_action: "qty", p_qtys: qtys });
  revalidatePath(back);
  go(back, error?.message, "수량을 바꿨습니다.");
}

/** 운영자: 몰 전체 정기 주문 일시정지 */
export async function pauseAllRecurringAction(slug: string, paused: boolean) {
  const back = `/s/${slug}/admin/recurring`;
  const { supabase, id } = await storeId(slug);
  if (!id) go(back, "몰을 찾을 수 없습니다.");
  const { error } = await supabase.rpc("mall_builder_recurring_pause_all", { p_store_id: id, p_paused: paused });
  revalidatePath(back);
  go(back, error?.message, paused ? "정기 주문 자동 실행을 모두 멈췄습니다." : "정기 주문 자동 실행을 다시 켰습니다.");
}
