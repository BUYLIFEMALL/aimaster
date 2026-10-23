"use server";

import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SavedThreadPlan, HookVariant } from "@/types/planner";
import { IMAGE_BUCKET, isOwnImageUrl } from "@/lib/storage/imageBucket";
import { IMAGE_FEATURE } from "@/lib/deployment";

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
  /** 글과 함께 만든 이미지 주소(이 회원 폴더 것만 저장) */
  imageUrls?: string[];
}

/** 30일 지난 이 회원의 글 이미지 파일을 지운다(보관함 목록을 열 때, 실패해도 목록은 계속) */
async function sweepExpiredImages(admin: ReturnType<typeof createAdminClient>, userId: string, cutoffMs: number) {
  try {
    const { data } = await admin.storage.from(IMAGE_BUCKET).list(userId, { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
    const expired = (data ?? [])
      .filter((f) => f.created_at && new Date(f.created_at).getTime() < cutoffMs)
      .map((f) => `${userId}/${f.name}`);
    if (expired.length > 0) await admin.storage.from(IMAGE_BUCKET).remove(expired);
  } catch {
    // 이미지 정리 실패가 목록 조회를 막지 않게
  }
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
      image_urls: (input.imageUrls || []).filter((url) => isOwnImageUrl(url, user.id)).slice(0, 4),
    };

    let { data, error } = await (admin as any)
      .from("tep_saved_plans")
      .insert(insertPayload)
      .select("*")
      .single();
    // 이미지 칸(image_urls)이 없는 옛 DB(배포판 v1.01 설치본 등)면 그 칸만 빼고 다시 저장 — 글 저장은 항상 되게
    if (error && /image_urls/i.test(error.message ?? "")) {
      const { image_urls: _skip, ...withoutImages } = insertPayload;
      void _skip;
      ({ data, error } = await (admin as any).from("tep_saved_plans").insert(withoutImages).select("*").single());
    }

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

    // 30일 보관 정책: 30일 지난 생성 데이터 자동 삭제 (TTL Sweep)
    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    try {
      await (admin as any)
        .from("tep_saved_plans")
        .delete()
        .lt("created_at", thirtyDaysAgoIso);
    } catch {
      // sweep 오류가 조회 자체를 중단시키지 않도록 방어
    }
    if (IMAGE_FEATURE) await sweepExpiredImages(admin, user.id, Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data, error } = await (admin as any)
      .from("tep_saved_plans")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", thirtyDaysAgoIso)
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
