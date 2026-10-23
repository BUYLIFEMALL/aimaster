"use server";

import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ProjectData, ProjectSummary } from "@/types/svs";

const RETENTION_DAYS = 30; // YouTube API 데이터 30일 보관 정책
const MAX_DATA_BYTES = 1_500_000;

/* eslint-disable @typescript-eslint/no-explicit-any */
async function db(): Promise<any> {
  return createClient();
}

/** 프로젝트 저장 (id가 있으면 갱신, 없으면 새로 생성) */
export async function saveProjectAction(input: {
  id?: string | null;
  title: string;
  keyword: string;
  data: ProjectData;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireProgramAccess();
    const title = (input.title ?? "").trim().slice(0, 120) || "제목 없는 프로젝트";
    const keyword = (input.keyword ?? "").trim().slice(0, 100);
    if (JSON.stringify(input.data ?? {}).length > MAX_DATA_BYTES) {
      return { success: false, error: "프로젝트 데이터가 너무 큽니다. 선택 영상 수를 줄여 주세요." };
    }

    const supabase = await db();
    const now = new Date().toISOString();

    if (input.id) {
      const { data, error } = await supabase
        .from("svs_projects")
        .update({ title, keyword, data: input.data, updated_at: now })
        .eq("id", input.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();
      if (error) return { success: false, error: error.message };
      if (data) return { success: true, data: { id: data.id } };
    }

    const { data, error } = await supabase
      .from("svs_projects")
      .insert({ user_id: user.id, title, keyword, data: input.data })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "프로젝트 저장 중 오류가 발생했습니다." };
  }
}

/** 내 프로젝트 목록 (30일 지난 항목은 이 시점에 함께 삭제) */
export async function listProjectsAction(): Promise<ActionResult<ProjectSummary[]>> {
  try {
    const user = await requireProgramAccess();
    const supabase = await db();

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
    await supabase.from("svs_projects").delete().eq("user_id", user.id).lt("created_at", cutoff);

    const { data, error } = await supabase
      .from("svs_projects")
      .select("id, title, keyword, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as ProjectSummary[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "프로젝트 목록을 불러오지 못했습니다." };
  }
}

export async function getProjectAction(id: string): Promise<ActionResult<{ id: string; title: string; data: ProjectData }>> {
  try {
    const user = await requireProgramAccess();
    const supabase = await db();
    const { data, error } = await supabase
      .from("svs_projects")
      .select("id, title, data")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "프로젝트를 찾을 수 없습니다." };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "프로젝트를 불러오지 못했습니다." };
  }
}

export async function deleteProjectAction(id: string): Promise<ActionResult<null>> {
  try {
    const user = await requireProgramAccess();
    const supabase = await db();
    const { error } = await supabase.from("svs_projects").delete().eq("id", id).eq("user_id", user.id);
    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "프로젝트를 삭제하지 못했습니다." };
  }
}
