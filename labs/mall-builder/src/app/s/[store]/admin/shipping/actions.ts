"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseWon } from "@/lib/products";
import { validatePolicy } from "@/lib/shipping";

// 보안 규칙(그 몰 운영자만 쓰기)을 그대로 거친다

async function staffStore(slug: string) {
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) back(slug, "몰을 찾을 수 없습니다.");
  const { data: staff } = await supabase.rpc("mall_builder_is_store_staff", { p_store_id: store!.id });
  if (staff !== true) back(slug, "이 몰을 고칠 권한이 없습니다.");
  return { supabase, storeId: store!.id as string };
}

function back(slug: string, error?: string): never {
  revalidatePath(`/s/${slug}`, "layout");
  redirect(`/s/${slug}/admin/shipping${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}

const num = (v: FormDataEntryValue | null) => {
  const n = parseWon(v);
  return n == null ? null : n;
};

export async function savePolicyAction(slug: string, policyId: string | null, form: FormData) {
  const input = {
    name: String(form.get("name") ?? "").trim(),
    type: String(form.get("type") ?? ""),
    base_fee: num(form.get("base_fee")),
    free_over: num(form.get("free_over")),
    jeju_fee: num(form.get("jeju_fee")),
    island_fee: num(form.get("island_fee")),
  };
  const error = validatePolicy(input);
  if (error) back(slug, error);
  const { supabase, storeId } = await staffStore(slug);
  const row = {
    name: input.name,
    type: input.type,
    base_fee: input.type === "free" ? 0 : input.base_fee ?? 0,
    free_over: input.type === "conditional" ? input.free_over : null,
    jeju_fee: input.jeju_fee ?? 0,
    island_fee: input.island_fee ?? 0,
  };
  if (policyId) {
    const { error: e } = await supabase.from("mall_builder_shipping_policies").update(row).eq("id", policyId).eq("store_id", storeId);
    back(slug, e?.message);
  }
  // 첫 정책은 자동으로 기본
  const { count } = await supabase.from("mall_builder_shipping_policies").select("id", { count: "exact", head: true }).eq("store_id", storeId);
  const { error: e } = await supabase.from("mall_builder_shipping_policies").insert({ ...row, store_id: storeId, is_default: !count });
  back(slug, e?.message);
}

export async function makeDefaultAction(slug: string, policyId: string) {
  const { supabase, storeId } = await staffStore(slug);
  // 기본은 몰마다 하나 — 기존 기본을 먼저 내리고 새로 올린다
  const { error: e1 } = await supabase.from("mall_builder_shipping_policies").update({ is_default: false }).eq("store_id", storeId).eq("is_default", true);
  if (e1) back(slug, e1.message);
  const { error: e2 } = await supabase.from("mall_builder_shipping_policies").update({ is_default: true }).eq("id", policyId).eq("store_id", storeId);
  back(slug, e2?.message);
}

export async function deletePolicyAction(slug: string, policyId: string) {
  const { supabase, storeId } = await staffStore(slug);
  const { data } = await supabase.from("mall_builder_shipping_policies").select("is_default").eq("id", policyId).eq("store_id", storeId).maybeSingle();
  if (data?.is_default) back(slug, "기본 정책은 지울 수 없습니다. 다른 정책을 기본으로 바꾼 뒤 지워 주세요.");
  // 이 정책을 쓰던 상품은 자동으로 기본 정책을 쓴다(on delete set null)
  const { error } = await supabase.from("mall_builder_shipping_policies").delete().eq("id", policyId).eq("store_id", storeId);
  back(slug, error?.message);
}
