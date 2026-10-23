import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ImageSet, Inputs, Strategy } from "@/lib/tmb/types";
import { cleanInputs, cleanStrategy } from "@/lib/tmb/validate";
import { cleanSet } from "@/lib/images";

export const COLUMNS = "id, name, inputs, strategy, images_a, images_b, stage, created_at, updated_at";

export interface ProjectRow {
  id: string; name: string; inputs: Inputs; strategy: Strategy | null;
  images_a: ImageSet; images_b: ImageSet; stage: string; created_at: string; updated_at: string;
}

/** 본인 프로젝트 1건을 읽는다(없으면 null). 항상 user_id로 필터한다. */
export async function loadOwned(userId: string, id: string): Promise<ProjectRow | null> {
  const { data } = await createAdminClient().from("thumbnail_master_projects").select(COLUMNS).eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return {
    id: data.id, name: data.name, inputs: cleanInputs(data.inputs), strategy: cleanStrategy(data.strategy),
    images_a: cleanSet(data.images_a), images_b: cleanSet(data.images_b),
    stage: data.stage, created_at: data.created_at, updated_at: data.updated_at,
  };
}

/** 프로젝트가 가진 모든 이미지 경로 */
export function allPaths(p: Pick<ProjectRow, "images_a" | "images_b">): string[] {
  return [...p.images_a.versions, ...p.images_b.versions].map((v) => v.path);
}
