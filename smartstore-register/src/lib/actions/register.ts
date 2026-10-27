"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getDefaults, getProductForRegister, ownExtraPaths } from "@/lib/data";
import { buildFillSteps, normalizeDefaults, normalizeAttributes, normalizeMainInfo, normalizeTags, toRegisterMode, withBuilderMark } from "@/lib/smartstore/fields";
import { normalizeCustomOptions, normalizeOptions } from "@/lib/smartstore/options";

// 모든 쓰기는 프로그램 이용 권한 확인 + 본인 행(user_id)만(CLAUDE.md 멀티테넌시 원칙 1·2).

export async function saveDefaultsAction(_prev: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const raw = Object.fromEntries(formData.entries());
  const data = normalizeDefaults({
    ...raw,
    noticeReference: raw.noticeReference === "on",
    displayOnRegister: raw.displayOnRegister === "on",
    returnFee: raw.returnFee === "" ? null : raw.returnFee,
    exchangeFee: raw.exchangeFee === "" ? null : raw.exchangeFee,
    ...Object.fromEntries((["qtyEvery", "rangeUpTo", "rangeExtraFee", "jejuFee", "islandFee", "baseFee", "freeOver"] as const).map((k) => [k, raw[k] === "" || raw[k] === undefined ? null : raw[k]])),
  });
  const supabase = await createClient();
  const { error } = await supabase
    .from("smartstore_register_defaults")
    .upsert({ user_id: user.id, data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/defaults");
  return { ok: true };
}

export async function createJobAction(_prev: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const productId = String(formData.get("productId") ?? "");
  const mode = toRegisterMode(formData.get("mode"));
  const categoryKeyword = String(formData.get("categoryKeyword") ?? "").trim().slice(0, 60);

  const loaded = await getProductForRegister(user.id, productId);
  if (!loaded) return { error: "상품을 찾을 수 없습니다." };
  const defaults = await getDefaults(user.id);
  let optionsRaw: unknown = null;
  try { optionsRaw = JSON.parse(String(formData.get("options") ?? "null")); } catch { return { error: "옵션 값을 읽지 못했습니다. 화면을 새로고침해 주세요." }; }
  const opt = normalizeOptions(optionsRaw, defaults.stock);
  if (opt.errors.length) return { error: opt.errors[0] };
  const built = buildFillSteps(loaded.product, defaults, {
    options: opt.spec,
    tags: normalizeTags(formData.get("tags")),
    attributes: normalizeAttributes(formData.get("attributes")),
    customOptions: normalizeCustomOptions(formData.get("customOptions")),
    mainInfo: normalizeMainInfo({ brand: formData.get("brand"), manufacturer: formData.get("manufacturer"), model: formData.get("modelName"), used: formData.get("saleType") }),
    mode,
    categoryKeyword,
    detailImageCount: loaded.sections.length,
    mainImage: Boolean(loaded.mainImage),
    extraImageCount: ownExtraPaths(user.id, loaded.product.reference_image_urls).length,
  });
  if (built.errors.length) return { error: built.errors[0] };

  const supabase = await createClient();
  // 같은 상품에 끝나지 않은 작업이 있으면 새로 만들지 않는다(중복 등록 방지).
  const { data: open } = await supabase
    .from("smartstore_register_jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .in("status", ["queued", "running"])
    .limit(1);
  if (open?.length) return { error: "이 상품은 이미 확장 대기 중인 작업이 있습니다. 「등록 기록」에서 취소한 뒤 다시 보내 주세요." };

  // 「바로 등록」은 실제 상품이 생긴다 — 같은 상품을 이미 등록했으면 회원이 「한 번 더 등록」을 체크해야만 보낸다(2026-10-27 실제 시험에서 중복 작업이 생길 뻔함).
  if (mode === "register" && formData.get("repeatOk") !== "on") {
    const { data: done } = await supabase
      .from("smartstore_register_jobs")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("status", "registered")
      .order("created_at", { ascending: false })
      .limit(1);
    if (done?.length) {
      const at = new Date(done[0].created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
      return { error: `이 상품은 이미 「바로 등록」으로 올렸습니다(${at}). 같은 상품을 한 번 더 올리려면 아래 「한 번 더 등록합니다」를 체크해 주세요.` };
    }
  }

  const { error } = await supabase.from("smartstore_register_jobs").insert({
    user_id: user.id,
    product_id: productId,
    mode,
    category_keyword: categoryKeyword,
    steps: withBuilderMark(built.steps),
  });
  if (error) return { error: "작업을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath(`/products/${productId}`);
  revalidatePath("/history");
  return { ok: true };
}

export async function cancelJobAction(formData: FormData): Promise<void> {
  const user = await requireProgramAccess();
  const id = String(formData.get("jobId") ?? "");
  const supabase = await createClient();
  await supabase
    .from("smartstore_register_jobs")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .in("status", ["queued", "running"]);
  revalidatePath("/history");
}
