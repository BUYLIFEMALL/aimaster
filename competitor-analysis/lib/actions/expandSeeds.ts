"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { retentionCutoff } from "@/lib/retention";

export interface CreateSeedState {
  error?: string;
}

export async function createSeedAction(formData: FormData): Promise<CreateSeedState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const keyword = String(formData.get("keyword") ?? "").trim();
  if (!keyword) return { error: "키워드를 입력해주세요." };

  const engineInput = String(formData.get("engine") ?? "").trim();
  const engine = engineInput === "google" ? "google" : "naver";

  const { error } = await supabase.from("longtail_seed_keywords").insert({
    user_id: user.id,
    keyword,
    engine,
  });
  if (error) return { error: error.message };

  revalidatePath("/expand");
  return {};
}

export async function toggleSeedActiveAction(seedId: string, isActive: boolean) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase
    .from("longtail_seed_keywords")
    .update({ is_active: isActive })
    .eq("id", seedId)
    .eq("user_id", user.id);

  revalidatePath("/expand");
}

export async function deleteSeedAction(seedId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("longtail_seed_keywords").delete().eq("id", seedId).eq("user_id", user.id);

  revalidatePath("/expand");
}

/** 실행(run) 1건을 삭제한다. FK on delete cascade는 없으므로(run은 leaf 테이블) 그냥 삭제한다. */
export async function deleteRunAction(seedId: string, runId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("longtail_runs").delete().eq("id", runId).eq("user_id", user.id);

  revalidatePath(`/expand/${seedId}`);
  revalidatePath("/expand");
  revalidatePath("/expand/history");
}

export interface RegisterForAnalysisState {
  error?: string;
  added?: number;
  skipped?: number;
}

const MAX_REGISTER = 10;

/**
 * 키워드 확장 결과에서 고른 키워드를 경쟁사 분석 키워드(competitor_keywords)로 등록한다(2026-10-23, v1.09).
 * 본인 씨드의 30일 안 결과(씨드 자체·연관·롱테일)에 실제로 있는 키워드만 받고, 이미 등록한 것은 건너뛴다.
 * 검색엔진은 씨드를 따르고 지역·언어는 경쟁사 분석 기본값(한국·ko)을 쓴다. 유료 호출 없음.
 */
export async function registerKeywordsForAnalysisAction(
  seedId: string,
  keywords: string[],
): Promise<RegisterForAnalysisState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const wanted = Array.from(new Set(keywords.map((k) => String(k).trim()).filter(Boolean)));
  if (wanted.length === 0) return { error: "등록할 키워드를 골라 주세요." };
  if (wanted.length > MAX_REGISTER) return { error: `한 번에 ${MAX_REGISTER}개까지 등록할 수 있습니다.` };

  const { data: seed } = await supabase
    .from("longtail_seed_keywords")
    .select("id, keyword, engine")
    .eq("id", seedId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!seed) return { error: "키워드를 찾을 수 없습니다." };

  const cutoff = retentionCutoff();
  const [{ data: related }, { data: expansions }] = await Promise.all([
    supabase.from("longtail_related_keywords").select("keyword").eq("user_id", user.id).eq("seed_id", seed.id).gt("created_at", cutoff),
    supabase.from("longtail_expansions").select("keyword").eq("user_id", user.id).eq("seed_id", seed.id).gt("created_at", cutoff),
  ]);
  const allowed = new Set([seed.keyword, ...(related ?? []).map((r) => r.keyword), ...(expansions ?? []).map((e) => e.keyword)]);
  if (wanted.some((k) => !allowed.has(k))) return { error: "이 확장 결과에 없는 키워드가 섞여 있습니다. 화면을 새로고침해 주세요." };

  const { data: existing } = await supabase
    .from("competitor_keywords")
    .select("keyword")
    .eq("user_id", user.id)
    .eq("engine", seed.engine)
    .in("keyword", wanted);
  const existingSet = new Set((existing ?? []).map((e) => e.keyword));
  const toAdd = wanted.filter((k) => !existingSet.has(k));

  if (toAdd.length > 0) {
    const { error } = await supabase.from("competitor_keywords").insert(
      toAdd.map((keyword) => ({
        user_id: user.id,
        keyword,
        location: "South Korea",
        google_domain: "google.com",
        lang: "ko",
        engine: seed.engine,
      })),
    );
    if (error) return { error: error.message };
  }

  revalidatePath("/keywords");
  return { added: toAdd.length, skipped: wanted.length - toAdd.length };
}
