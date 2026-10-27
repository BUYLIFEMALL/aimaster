"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getDefaults, getProductForRegister, ownExtraPaths } from "@/lib/data";
import { buildFillSteps, lastCategory, normalizeDefaults, normalizeAttributes, normalizeMainInfo, normalizePreOrder, normalizeSupplements, normalizeTags, toRegisterMode, withBuilderMark, type RegisterMode } from "@/lib/smartstore/fields";
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
    ...Object.fromEntries((["qtyEvery", "rangeUpTo", "rangeExtraFee", "jejuFee", "islandFee", "baseFee", "freeOver", "purchasePoint", "reviewText", "reviewPhoto", "multiQty", "multiDiscount"] as const).map((k) => [k, raw[k] === "" || raw[k] === undefined ? null : raw[k]])),
  });
  // 판매자센터 규칙: 포토/동영상 리뷰 포인트는 텍스트 리뷰보다 크거나 같아야 한다(2026-10-27 실측 오류 문구)
  if (data.reviewText != null && data.reviewPhoto != null && data.reviewPhoto < data.reviewText) return { error: "포토/동영상 리뷰 포인트는 텍스트 리뷰 포인트보다 크거나 같아야 합니다(스마트스토어 규칙)." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("smartstore_register_defaults")
    .upsert({ user_id: user.id, data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/defaults");
  return { ok: true };
}

type JobInputs = {
  options: unknown;
  tags: unknown;
  attributes: unknown;
  customOptions: unknown;
  supplements: unknown;
  mainInfo: { brand: unknown; manufacturer: unknown; model: unknown; used: unknown };
  preOrder: { on?: unknown; start?: unknown; end?: unknown; after?: unknown };
};

/** 작업 하나 만들기 — 한 상품 보내기와 연속 보내기가 같이 쓴다. 오류면 { error }. */
async function queueJob(userId: string, productId: string, mode: RegisterMode, categoryKeyword: string, inputs: JobInputs, repeatOk: boolean): Promise<{ error?: string; name?: string }> {
  const loaded = await getProductForRegister(userId, productId);
  if (!loaded) return { error: "상품을 찾을 수 없습니다." };
  const name = loaded.product.name || loaded.product.product_label || "(상품명 없음)";
  const defaults = await getDefaults(userId);
  const opt = normalizeOptions(inputs.options, defaults.stock);
  if (opt.errors.length) return { error: opt.errors[0], name };
  const sup = normalizeSupplements(inputs.supplements);
  if (sup.errors.length) return { error: sup.errors[0], name };
  const pre = normalizePreOrder(inputs.preOrder);
  if (pre.error) return { error: pre.error, name };
  const built = buildFillSteps(loaded.product, defaults, {
    options: opt.spec,
    tags: normalizeTags(inputs.tags),
    attributes: normalizeAttributes(inputs.attributes),
    customOptions: normalizeCustomOptions(inputs.customOptions),
    supplements: sup.groups,
    preOrder: pre.preOrder,
    mainInfo: normalizeMainInfo(inputs.mainInfo),
    mode,
    categoryKeyword,
    detailImageCount: loaded.sections.length,
    mainImage: Boolean(loaded.mainImage),
    extraImageCount: ownExtraPaths(userId, loaded.product.reference_image_urls).length,
  });
  if (built.errors.length) return { error: built.errors[0], name };

  const supabase = await createClient();
  // 같은 상품에 끝나지 않은 작업이 있으면 새로 만들지 않는다(중복 등록 방지).
  const { data: open } = await supabase
    .from("smartstore_register_jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .in("status", ["queued", "running"])
    .limit(1);
  if (open?.length) return { error: "이 상품은 이미 확장 대기 중인 작업이 있습니다. 「등록 기록」에서 취소한 뒤 다시 보내 주세요.", name };

  // 「바로 등록」은 실제 상품이 생긴다 — 같은 상품을 이미 등록했으면 회원이 「한 번 더 등록」을 체크해야만 보낸다(2026-10-27 실제 시험에서 중복 작업이 생길 뻔함).
  if (mode === "register" && !repeatOk) {
    const { data: done } = await supabase
      .from("smartstore_register_jobs")
      .select("created_at")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .eq("status", "registered")
      .order("created_at", { ascending: false })
      .limit(1);
    if (done?.length) {
      const at = new Date(done[0].created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
      return { error: `이 상품은 이미 「바로 등록」으로 올렸습니다(${at}). 같은 상품을 한 번 더 올리려면 「한 번 더 등록합니다」를 체크해 주세요.`, name };
    }
  }

  const { error } = await supabase.from("smartstore_register_jobs").insert({
    user_id: userId,
    product_id: productId,
    mode,
    category_keyword: categoryKeyword,
    steps: withBuilderMark(built.steps),
  });
  if (error) return { error: "작업을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.", name };
  revalidatePath(`/products/${productId}`);
  return { name };
}

export async function createJobAction(_prev: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const productId = String(formData.get("productId") ?? "");
  const mode = toRegisterMode(formData.get("mode"));
  const categoryKeyword = String(formData.get("categoryKeyword") ?? "").trim().slice(0, 60);
  let options: unknown = null;
  try { options = JSON.parse(String(formData.get("options") ?? "null")); } catch { return { error: "옵션 값을 읽지 못했습니다. 화면을 새로고침해 주세요." }; }
  const r = await queueJob(user.id, productId, mode, categoryKeyword, {
    options,
    tags: formData.get("tags"),
    attributes: formData.get("attributes"),
    customOptions: formData.get("customOptions"),
    supplements: formData.get("supplements"),
    mainInfo: { brand: formData.get("brand"), manufacturer: formData.get("manufacturer"), model: formData.get("modelName"), used: formData.get("saleType") },
    preOrder: { on: formData.get("preOrderOn"), start: formData.get("preOrderStart"), end: formData.get("preOrderEnd"), after: formData.get("preOrderAfter") },
  }, formData.get("repeatOk") === "on");
  if (r.error) return { error: r.error };
  revalidatePath("/history");
  return { ok: true };
}

const BATCH_MAX = 20;

/**
 * 여러 상품 연속 보내기(2026-10-27 v1.14) — 고른 상품마다 작업을 하나씩 쌓는다. 확장은 오래된 작업부터 하나씩 처리한다.
 * 「입력만」은 다음 작업이 같은 탭을 덮으므로 받지 않는다. 상품마다 마지막에 보낸 입력(옵션·태그·주요정보·속성·추가상품·카테고리 검색어)을 그대로 쓰고,
 * 예약구매는 날짜가 상품마다 달라 넣지 않는다. 「바로 등록」은 이미 등록한 상품을 건너뛴다.
 */
export async function createBatchJobsAction(_prev: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string; created?: string[]; skipped?: string[] }> {
  const user = await requireProgramAccess();
  const mode = toRegisterMode(formData.get("mode"));
  if (mode === "fill_only") return { error: "연속 보내기는 「임시저장까지」나 「바로 등록」만 됩니다(「입력만」은 다음 상품이 같은 탭을 덮어씁니다)." };
  if (mode === "register" && formData.get("confirmRegister") !== "on") return { error: "「바로 등록」은 실제 상품이 생깁니다. 확인 상자를 체크해 주세요." };
  const ids = [...new Set(formData.getAll("productIds").map(String).filter(Boolean))];
  if (!ids.length) return { error: "보낼 상품을 골라 주세요." };
  if (ids.length > BATCH_MAX) return { error: `한 번에 ${BATCH_MAX}개까지 보낼 수 있습니다.` };

  const supabase = await createClient();
  const created: string[] = [];
  const skipped: string[] = [];
  for (const id of ids) {
    const { data: last } = await supabase
      .from("smartstore_register_jobs")
      .select("steps, category_keyword")
      .eq("user_id", user.id)
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(5);
    const rows = (last ?? []) as { steps: { key: string; value: string }[] | null; category_keyword: string | null }[];
    const step = (k: string) => { for (const r of rows) { const s = (r.steps ?? []).find((x) => x.key === k); if (s) return s.value; } return undefined; };
    const json = (k: string) => { const v = step(k); if (v === undefined) return null; try { return JSON.parse(v); } catch { return null; } };
    const loaded = await getProductForRegister(user.id, id);
    const keyword = (rows.find((r) => r.category_keyword)?.category_keyword ?? lastCategory(loaded?.product.category ?? null)).trim().slice(0, 60);
    const r = await queueJob(user.id, id, mode, keyword, {
      options: json("options"),
      tags: json("tags"),
      attributes: json("attributes"),
      customOptions: json("custom_options"),
      supplements: json("supplements"),
      mainInfo: { brand: step("brand") ?? "", manufacturer: step("manufacturer") ?? "", model: step("model_name") ?? "", used: step("sale_type") !== undefined },
      preOrder: {},
    }, false);
    if (r.error) skipped.push(`${r.name ?? "상품"} — ${r.error}`);
    else created.push(r.name ?? id);
  }
  revalidatePath("/history");
  revalidatePath("/products");
  return { ok: created.length > 0, created, skipped };
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
