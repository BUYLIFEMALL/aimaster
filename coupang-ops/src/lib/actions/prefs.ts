"use server";

import { requireProgramAccess } from "@/lib/access";
import { normalizePrefs, type Prefs } from "@/lib/coupang/prefs";
import { createClient } from "@/lib/supabase/server";

export async function loadPrefsAction(): Promise<Prefs> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data } = await supabase.from("coupang_ops_prefs").select("data").eq("user_id", user.id).maybeSingle();
  return normalizePrefs(data?.data);
}

/** 고친 칸만 바꾼다(다른 탭·다른 기능의 설정을 덮어쓰지 않게 저장 직전에 다시 읽는다) */
export async function savePrefsAction(patch: Partial<Prefs>): Promise<{ ok: true; prefs: Prefs } | { ok: false; error: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data } = await supabase.from("coupang_ops_prefs").select("data").eq("user_id", user.id).maybeSingle();
  const prefs = normalizePrefs({ ...normalizePrefs(data?.data), ...patch });
  const { error } = await supabase.from("coupang_ops_prefs").upsert({ user_id: user.id, data: prefs, updated_at: new Date().toISOString() });
  return error ? { ok: false, error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." } : { ok: true, prefs };
}
