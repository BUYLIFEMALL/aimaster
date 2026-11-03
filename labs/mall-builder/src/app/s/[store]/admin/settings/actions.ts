"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateBusinessInfo, type BusinessInfo } from "@/lib/businessInfo";
import { storeNameError } from "@/lib/slug";

export type SettingsState = {
  saved: boolean;
  error: string | null;
  fieldErrors: Partial<Record<keyof BusinessInfo | "name", string>>;
  /** 제출한 값 — 폼이 제출 뒤 처음 값으로 되돌아가지 않게 다시 채운다 */
  values?: Record<string, string>;
};

export async function saveStoreInfoAction(slug: string, _prev: SettingsState, form: FormData): Promise<SettingsState> {
  const name = String(form.get("name") ?? "").trim();
  const nameError = storeNameError(name);
  const input = Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]));
  const checked = validateBusinessInfo(input);

  const fieldErrors: SettingsState["fieldErrors"] = checked.ok ? {} : { ...checked.errors };
  if (nameError) fieldErrors.name = nameError;
  const values = input as Record<string, string>;
  if (!checked.ok || nameError) return { saved: false, error: "입력값을 확인해 주세요.", fieldErrors, values };

  const supabase = await createClient();
  // 보안 규칙이 그 몰 운영자만 고치게 한다 — 바뀐 줄이 0이면 권한이 없는 것
  const { data, error } = await supabase
    .from("mall_builder_stores")
    .update({ name, business_info: checked.value })
    .eq("slug", slug)
    .select("id");
  if (error) return { saved: false, error: error.message, fieldErrors: {}, values };
  if (!data?.length) return { saved: false, error: "이 몰을 고칠 권한이 없습니다.", fieldErrors: {}, values };

  revalidatePath(`/s/${slug}`, "layout");
  return { saved: true, error: null, fieldErrors: {}, values: { name, ...checked.value } };
}
