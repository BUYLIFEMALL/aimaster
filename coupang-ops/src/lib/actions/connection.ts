"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { WING_FIELDS, WING_KEYS, validateWingKeys } from "@/lib/coupang/keys";
import { checkDefaults, normalizeDefaults } from "@/lib/coupang/defaults";

// 모든 쓰기는 프로그램 이용 권한 확인 + 본인 행(user_id)만(CLAUDE.md 멀티테넌시 원칙 1·2).

export async function saveWingKeysAction(_prev: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const { keys, error } = validateWingKeys(Object.fromEntries(formData.entries()));
  if (!keys) return { error };
  const supabase = await createClient();
  const rows = WING_FIELDS.map((f) => ({ user_id: user.id, provider: WING_KEYS[f], api_key: keys[f] }));
  const { error: dbError } = await supabase.from("user_api_keys").upsert(rows, { onConflict: "user_id,provider" });
  if (dbError) return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/connect");
  return { ok: true };
}

export async function deleteWingKeysAction(): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .in("provider", Object.values(WING_KEYS));
  if (error) return { error: "지우지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/connect");
  return { ok: true };
}

export async function saveDefaultsAction(_prev: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string; problems?: string[] }> {
  const user = await requireProgramAccess();
  const data = normalizeDefaults(Object.fromEntries(formData.entries()));
  const problems = checkDefaults(data);
  if (problems.length) return { problems };
  const supabase = await createClient();
  const { error } = await supabase
    .from("coupang_ops_defaults")
    .upsert({ user_id: user.id, data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/defaults");
  return { ok: true };
}
