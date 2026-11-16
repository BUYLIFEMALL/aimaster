"use server";

// M2-12a 운영사 메시지 — 보내기·미리보기·설정·문구. 막기 규칙(권한·연결·광고·상한)은 DB 함수가 모두 검사한다(0101)
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";
import { applyCustomerFilters, parseCustomerListQuery } from "@/lib/customer-list";
import { isUuid } from "@/lib/product-list";
import { BULK_ONCE_MAX, validateMessage, validateMessageSettings } from "@/lib/messages";

export type SendState = {
  error?: string;
  preview?: { targets: number; will_send: number; no_agree: number; no_contact: number; today: number; limit_once: number; limit_day: number; preview_subject: string; preview_body: string };
  sent?: { will_send: number; no_agree: number; no_contact: number };
};

/** 받는 사람 고르기: 유저 한 명 / 주문 한 건 / 유저 목록 조건(M2-8과 같은 조건) */
async function resolveTargets(storeId: string, form: FormData): Promise<{ customerIds: string[]; orderId: string | null } | { error: string }> {
  const target = String(form.get("target") ?? "");
  if (target === "order") {
    const id = String(form.get("order_id") ?? "");
    return isUuid(id) ? { customerIds: [], orderId: id } : { error: "주문을 찾을 수 없습니다." };
  }
  if (target === "customer") {
    const id = String(form.get("customer_id") ?? "");
    return isUuid(id) ? { customerIds: [id], orderId: null } : { error: "유저를 찾을 수 없습니다." };
  }
  if (target === "filter") {
    const raw = Object.fromEntries(new URLSearchParams(String(form.get("filter") ?? "")));
    const f = parseCustomerListQuery(raw);
    const supabase = await createClient();
    const query = supabase.from("mall_builder_store_customers").select("id", { count: "exact" }).eq("store_id", storeId).order("created_at", { ascending: false }).limit(BULK_ONCE_MAX + 1);
    const { data, count, error } = await applyCustomerFilters(query, f);
    if (error) return { error: "유저 목록을 읽지 못했습니다." };
    const ids = (data ?? []).map((r) => r.id as string);
    // 서버가 한 번에 돌려주는 줄 수에 한도가 있어 잘린 채 보내지 않도록 전체 건수와 비교한다
    if ((count ?? ids.length) > ids.length || ids.length > BULK_ONCE_MAX) {
      return { error: `대상이 ${(count ?? ids.length).toLocaleString("ko-KR")}명이라 한 번에 보낼 수 없습니다(최대 ${BULK_ONCE_MAX.toLocaleString("ko-KR")}명). 유저 목록에서 조건을 좁혀 주세요.` };
    }
    return { customerIds: ids, orderId: null };
  }
  return { error: "받는 사람을 골라 주세요." };
}

export async function sendMessageAction(slug: string, _prev: SendState, form: FormData): Promise<SendState> {
  const v = validateMessage({ channel: form.get("channel"), is_ad: form.get("is_ad"), subject: form.get("subject"), body: form.get("body") });
  if (!v.ok) return { error: v.error };
  const store = await getStoreBySlug(slug);
  const t = await resolveTargets(store.id, form);
  if ("error" in t) return { error: t.error };
  const dryRun = form.get("mode") !== "send";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_message_send", {
    p_store_id: store.id,
    p_channel: v.value.channel,
    p_is_ad: v.value.isAd,
    p_subject: v.value.subject,
    p_body: v.value.body,
    p_customer_ids: t.customerIds,
    p_order_id: t.orderId,
    p_dry_run: dryRun,
  });
  if (error) return { error: error.message };
  if (dryRun) return { preview: data as SendState["preview"] };
  revalidatePath(`/s/${slug}/admin/messages`);
  return { sent: data as SendState["sent"] };
}

export async function saveMessageSettingsAction(slug: string, form: FormData) {
  const back = (q: string) => redirect(`/s/${slug}/admin/messages/settings?${q}`);
  const v = validateMessageSettings({
    bulk_once: form.get("bulk_once"),
    bulk_day: form.get("bulk_day"),
    optout: form.get("optout"),
    kinds: form.getAll("kinds"),
    email_kinds: form.getAll("email_kinds"),
  });
  if (!v.ok) back(`error=${encodeURIComponent(v.error)}`);
  const ok = v as Extract<typeof v, { ok: true }>;
  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_message_settings_save", {
    p_store_id: store.id,
    p_bulk_once: ok.value.bulkOnce,
    p_bulk_day: ok.value.bulkDay,
    p_optout: ok.value.optout,
    p_extra_kinds: ok.value.kinds,
    p_extra_email_kinds: ok.value.emailKinds,
  });
  revalidatePath(`/s/${slug}/admin/messages/settings`);
  back(error ? `error=${encodeURIComponent(error.message)}` : "ok=settings");
}

/** 문구 저장 — 본문을 비우면 기본 문구로 되돌림 */
export async function saveTemplateAction(slug: string, kind: string, channel: string, form: FormData) {
  const back = (q: string) => redirect(`/s/${slug}/admin/messages/settings?${q}#t-${kind}-${channel}`);
  const body = String(form.get("body") ?? "").trim();
  const subject = String(form.get("subject") ?? "").trim();
  if (body.length > 1000) back(`error=${encodeURIComponent("문구는 1,000자까지입니다.")}`);
  if (subject.length > 100) back(`error=${encodeURIComponent("제목은 100자까지입니다.")}`);
  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_notify_template_save", { p_store_id: store.id, p_kind: kind, p_channel: channel, p_subject: subject, p_body: body });
  revalidatePath(`/s/${slug}/admin/messages/settings`);
  back(error ? `error=${encodeURIComponent(error.message)}` : body ? "ok=template" : "ok=template_reset");
}
