"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

/**
 * 본인 타로 리딩 이력 1건을 삭제한다. RLS(owner-only delete 정책)로도 막혀 있지만,
 * 방어적으로 user_id 조건을 쿼리에도 명시한다(0004_create_tarot_readings.sql 참고).
 */
export async function deleteReadingAction(formData: FormData) {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("tarot_readings").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/history");
}
