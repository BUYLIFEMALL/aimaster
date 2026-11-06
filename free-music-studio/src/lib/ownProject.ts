// 서버 전용 — 이 회원의 프로젝트인지(초안·곡 기록에 프로젝트를 붙이기 전에 확인, 2026-11-06)
import type { createAdminClient } from "@/lib/supabase/admin";
import { COLLECTIONS_TABLE } from "@/lib/collections";

export async function isOwnProject(admin: ReturnType<typeof createAdminClient>, userId: string, projectId: string | null): Promise<boolean> {
  if (projectId === null) return true;
  const { data } = await admin.from(COLLECTIONS_TABLE).select("id").eq("id", projectId).eq("user_id", userId).eq("kind", "project").maybeSingle();
  return !!data;
}
