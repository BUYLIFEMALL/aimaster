"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getDefaults, getProductForRegister, ownExtraPaths } from "@/lib/data";
import { COLLECTED_PHOTO_ACK_REQUIRED, usesCollectedPhoto } from "@/lib/collectedPhoto";
import { buildFillSteps, normalizeDefaults, normalizeOption, toRegisterMode, withBuilderMark } from "@/lib/esm/fields";

// 모든 쓰기는 프로그램 이용 권한 확인 + 본인 행(user_id)만(CLAUDE.md 멀티테넌시 원칙 1·2).

export async function saveDefaultsAction(_prev: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const raw = Object.fromEntries(formData.entries());
  const data = normalizeDefaults({
    ...raw,
    noticeReference: raw.noticeReference === "on",
    certNotTarget: raw.certNotTarget === "on",
    licenseNotTarget: raw.licenseNotTarget === "on",
    returnFee: raw.returnFee === "" || raw.returnFee === undefined ? null : raw.returnFee,
  });
  const supabase = await createClient();
  const { error } = await supabase
    .from("esm_register_defaults")
    .upsert({ user_id: user.id, data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/defaults");
  return { ok: true };
}

const won = (v: unknown): number | null => {
  const s = String(v ?? "").replace(/[,\s원]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};

export async function createJobAction(_prev: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const productId = String(formData.get("productId") ?? "");
  const mode = toRegisterMode(formData.get("mode"));
  const categoryKeyword = String(formData.get("categoryKeyword") ?? "").trim().slice(0, 60);
  if (mode === "register" && formData.get("confirmRegister") !== "on") return { error: "「바로 등록」은 G마켓·옥션에 실제 상품이 생깁니다. 확인 상자를 체크해 주세요." };

  const loaded = await getProductForRegister(user.id, productId);
  if (!loaded) return { error: "상품을 찾을 수 없습니다." };
  if (usesCollectedPhoto(loaded.product) && formData.get("collectedAck") !== "on") return { error: COLLECTED_PHOTO_ACK_REQUIRED };

  const op = won(formData.get("price")), os = won(formData.get("salePrice"));
  if (Number.isNaN(op) || Number.isNaN(os)) return { error: "판매가·할인가는 숫자로 넣어 주세요." };
  if (op != null) loaded.product.price = op;
  if (os != null || op != null) loaded.product.sale_price = os;

  const opt = normalizeOption({ name: formData.get("optionName"), values: formData.get("optionValues") });
  if (opt.error) return { error: opt.error };
  const brand = String(formData.get("brand") ?? "").replace(/\s+/g, " ").trim().slice(0, 40);

  const defaults = await getDefaults(user.id);
  const built = buildFillSteps(loaded.product, defaults, {
    mode,
    categoryKeyword,
    detailImageCount: loaded.sections.length,
    mainImage: Boolean(loaded.mainImage),
    extraImageCount: ownExtraPaths(user.id, loaded.product.reference_image_urls).length,
    option: opt.option,
    brand,
  });
  if (built.errors.length) return { error: built.errors[0] };

  const supabase = await createClient();
  // 같은 상품에 끝나지 않은 작업이 있으면 새로 만들지 않는다(중복 등록 방지)
  const { data: open } = await supabase
    .from("esm_register_jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .in("status", ["queued", "running"])
    .limit(1);
  if (open?.length) return { error: "이 상품은 이미 확장 대기 중인 작업이 있습니다. 「등록 기록」에서 취소한 뒤 다시 보내 주세요." };

  // 「바로 등록」을 이미 성공한 상품은 「한 번 더 등록합니다」를 체크해야만 보낸다
  if (mode === "register" && formData.get("repeatOk") !== "on") {
    const { data: done } = await supabase
      .from("esm_register_jobs")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("status", "registered")
      .order("created_at", { ascending: false })
      .limit(1);
    if (done?.length) {
      const at = new Date(done[0].created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
      return { error: `이 상품은 이미 「바로 등록」으로 올렸습니다(${at}). 한 번 더 올리려면 「한 번 더 등록합니다」를 체크해 주세요.` };
    }
  }

  const { error } = await supabase.from("esm_register_jobs").insert({
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
    .from("esm_register_jobs")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .in("status", ["queued", "running"]);
  revalidatePath("/history");
}
