"use server";

import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, BgmPrompt, SavedPromptSet, ScenePrompt } from "@/types/svs";

const MAX_SETS_PER_USER = 200;
const MAX_SCENES = 40;

function clip(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function cleanPrompts(input: ScenePrompt[]): ScenePrompt[] {
  return (Array.isArray(input) ? input : []).slice(0, MAX_SCENES).map((p, i) => ({
    sceneNumber: Number(p?.sceneNumber) || i + 1,
    sceneSummary: clip(p?.sceneSummary, 300),
    imagePrompt: clip(p?.imagePrompt, 3000),
    videoPrompt: clip(p?.videoPrompt, 3000),
  }));
}

function cleanBgm(input: BgmPrompt | null): BgmPrompt | null {
  if (!input) return null;
  return {
    title: clip(input.title, 200),
    genreAndMood: clip(input.genreAndMood, 500),
    bpm: clip(input.bpm, 100),
    instrumentation: clip(input.instrumentation, 500),
    dynamicStructure: clip(input.dynamicStructure, 800),
    sunoPrompt: clip(input.sunoPrompt, 3000),
    audioMixingNotes: clip(input.audioMixingNotes, 800),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = {
  id: string;
  title: string;
  idea_title: string;
  hook: string;
  keyword: string;
  bgm_prompt: BgmPrompt | null;
  prompts: ScenePrompt[];
  created_at: string;
};

function toSet(r: Row): SavedPromptSet {
  return {
    id: r.id,
    title: r.title,
    ideaTitle: r.idea_title,
    hook: r.hook,
    keyword: r.keyword,
    bgmPrompt: r.bgm_prompt,
    prompts: Array.isArray(r.prompts) ? r.prompts : [],
    createdAt: r.created_at,
  };
}

/** 최종 생성된 프롬프트 세트를 보관함에 저장 */
export async function savePromptSetAction(input: {
  title: string;
  ideaTitle: string;
  hook: string;
  keyword: string;
  bgmPrompt: BgmPrompt | null;
  prompts: ScenePrompt[];
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireProgramAccess();
    const prompts = cleanPrompts(input.prompts).filter((p) => p.imagePrompt || p.videoPrompt);
    if (prompts.length === 0) return { success: false, error: "저장할 프롬프트가 없습니다." };

    const supabase = (await createClient()) as any;

    const { count } = await supabase
      .from("svs_saved_prompts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= MAX_SETS_PER_USER) {
      return { success: false, error: `보관함은 최대 ${MAX_SETS_PER_USER}세트까지 저장할 수 있습니다. 오래된 세트를 삭제해 주세요.` };
    }

    const ideaTitle = clip(input.ideaTitle, 200);
    const { data, error } = await supabase
      .from("svs_saved_prompts")
      .insert({
        user_id: user.id,
        title: clip(input.title, 120).trim() || ideaTitle || "제목 없는 프롬프트",
        idea_title: ideaTitle,
        hook: clip(input.hook, 300),
        keyword: clip(input.keyword, 100),
        bgm_prompt: cleanBgm(input.bgmPrompt),
        prompts,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "보관함에 저장하지 못했습니다." };
  }
}

export async function listSavedPromptsAction(): Promise<ActionResult<SavedPromptSet[]>> {
  try {
    const user = await requireProgramAccess();
    const supabase = (await createClient()) as any;
    const { data, error } = await supabase
      .from("svs_saved_prompts")
      .select("id, title, idea_title, hook, keyword, bgm_prompt, prompts, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_SETS_PER_USER);
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as Row[]).map(toSet) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "보관함을 불러오지 못했습니다." };
  }
}

export async function deleteSavedPromptAction(id: string): Promise<ActionResult<null>> {
  try {
    const user = await requireProgramAccess();
    const supabase = (await createClient()) as any;
    const { error } = await supabase.from("svs_saved_prompts").delete().eq("id", id).eq("user_id", user.id);
    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "삭제하지 못했습니다." };
  }
}
