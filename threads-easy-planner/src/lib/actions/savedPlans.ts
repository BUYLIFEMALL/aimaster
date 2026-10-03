"use server";

import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SavedThreadPlan, HookVariant } from "@/types/planner";

export interface SavePlanInput {
  topic: string;
  hook: string;
  hookReason?: string;
  hookVariants?: HookVariant[];
  bodyText: string;
  replyCta?: string;
  followUpTopics?: string[];
  personaId?: string;
  personaName?: string;
  modelLabel?: string;
}

export interface SavePlanResult {
  success: boolean;
  data?: SavedThreadPlan;
  error?: string;
  fallbackToLocal?: boolean;
}

/**
 * 1. 콘텐츠 보관함에 새 글 저장
 */
export async function saveThreadPlanAction(input: SavePlanInput): Promise<SavePlanResult> {
  try {
    const user = await requireProgramAccess();
    const admin = createAdminClient();

    const insertPayload = {
      user_id: user.id,
      topic: input.topic.trim(),
      hook: input.hook.trim(),
      hook_reason: input.hookReason || "",
      hook_variants: input.hookVariants || [],
      body_text: input.bodyText.trim(),
      reply_cta: input.replyCta || "",
      follow_up_topics: input.followUpTopics || [],
      persona_id: input.personaId || null,
      persona_name: input.personaName || null,
      model_label: input.modelLabel || null,
    };

    const { data, error } = await (admin as any)
      .from("tep_saved_plans")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      console.warn("[saveThreadPlanAction] DB 저장 실패 (테이블 미생성 또는 권한):", error.message);
      return {
        success: false,
        error: error.message,
        fallbackToLocal: true,
      };
    }

    return {
      success: true,
      data: data as SavedThreadPlan,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.";
    console.error("[saveThreadPlanAction] Exception:", msg);
    return {
      success: false,
      error: msg,
      fallbackToLocal: true,
    };
  }
}

/**
 * 2. 내 보관함 전체 목록 조회
 */
export async function getSavedThreadPlansAction(): Promise<{
  success: boolean;
  data?: SavedThreadPlan[];
  error?: string;
  fallbackToLocal?: boolean;
}> {
  try {
    const user = await requireProgramAccess();
    const admin = createAdminClient();

    const { data, error } = await (admin as any)
      .from("tep_saved_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[getSavedThreadPlansAction] DB 조회 실패:", error.message);
      return {
        success: false,
        error: error.message,
        fallbackToLocal: true,
      };
    }

    return {
      success: true,
      data: (data || []) as SavedThreadPlan[],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "목록 조회 중 오류가 발생했습니다.";
    return {
      success: false,
      error: msg,
      fallbackToLocal: true,
    };
  }
}

/**
 * 3. 보관함 특정 글 단건 조회
 */
export async function getSavedThreadPlanByIdAction(id: string): Promise<{
  success: boolean;
  data?: SavedThreadPlan;
  error?: string;
  fallbackToLocal?: boolean;
}> {
  try {
    const user = await requireProgramAccess();
    const admin = createAdminClient();

    const { data, error } = await (admin as any)
      .from("tep_saved_plans")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message, fallbackToLocal: true };
    }

    if (!data) {
      return { success: false, error: "해당 글을 찾을 수 없습니다." };
    }

    return { success: true, data: data as SavedThreadPlan };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "조회 중 오류가 발생했습니다.";
    return { success: false, error: msg, fallbackToLocal: true };
  }
}

/**
 * 4. 보관함 특정 글 삭제
 */
export async function deleteSavedThreadPlanAction(id: string): Promise<{
  success: boolean;
  error?: string;
  fallbackToLocal?: boolean;
}> {
  try {
    const user = await requireProgramAccess();
    const admin = createAdminClient();

    const { error } = await (admin as any)
      .from("tep_saved_plans")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message, fallbackToLocal: true };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.";
    return { success: false, error: msg, fallbackToLocal: true };
  }
}
