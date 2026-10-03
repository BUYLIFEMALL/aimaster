"use client";

import type { SavedThreadPlan, HookVariant } from "@/types/planner";
import {
  saveThreadPlanAction,
  getSavedThreadPlansAction,
  getSavedThreadPlanByIdAction,
  deleteSavedThreadPlanAction,
  type SavePlanInput,
} from "@/lib/actions/savedPlans";

const LOCAL_STORAGE_KEY = "tep_saved_plans_local_cache";
export const RETENTION_DAYS = 30;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function isPlanExpired(createdAt: string): boolean {
  try {
    const time = new Date(createdAt).getTime();
    return Date.now() - time > RETENTION_MS;
  } catch {
    return false;
  }
}

export function getDaysRemaining(createdAt: string): number {
  try {
    const time = new Date(createdAt).getTime();
    const expiresTime = time + RETENTION_MS;
    const diff = Math.ceil((expiresTime - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, diff);
  } catch {
    return 30;
  }
}

function getLocalPlans(): SavedThreadPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const list: SavedThreadPlan[] = JSON.parse(raw);
    const valid = list.filter((p) => !isPlanExpired(p.created_at));
    if (valid.length !== list.length) {
      setLocalPlans(valid);
    }
    return valid;
  } catch {
    return [];
  }
}

function setLocalPlans(plans: SavedThreadPlan[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // ignore quota errors
  }
}

/**
 * 콘텐츠 보관함에 글 저장 (DB 우선 + 로컬 백업)
 */
export async function savePlanToStorage(input: SavePlanInput): Promise<{
  success: boolean;
  data?: SavedThreadPlan;
  isLocalOnly?: boolean;
  error?: string;
}> {
  // 1. Server Action (DB 저장 시도)
  try {
    const res = await saveThreadPlanAction(input);
    if (res.success && res.data) {
      // 로컬 캐시에도 최신 항목 동기화
      const local = getLocalPlans().filter((p) => p.id !== res.data!.id);
      setLocalPlans([res.data, ...local]);
      return { success: true, data: res.data, isLocalOnly: false };
    }
  } catch (e) {
    console.warn("DB 저장 실패, 로컬 저장소로 자동 백업합니다:", e);
  }

  // 2. Fallback: 로컬 스토리지에 저장
  try {
    const newId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();
    const localPlan: SavedThreadPlan = {
      id: newId,
      topic: input.topic.trim(),
      hook: input.hook.trim(),
      hook_reason: input.hookReason || "",
      hook_variants: input.hookVariants || [],
      body_text: input.bodyText.trim(),
      reply_cta: input.replyCta || "",
      follow_up_topics: input.followUpTopics || [],
      persona_id: input.personaId,
      persona_name: input.personaName,
      model_label: input.modelLabel,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const current = getLocalPlans();
    setLocalPlans([localPlan, ...current]);
    return { success: true, data: localPlan, isLocalOnly: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "로컬 저장에 실패했습니다.";
    return { success: false, error: msg };
  }
}

/**
 * 저장된 글 전체 목록 로드 (DB 우선 + 로컬 병합)
 */
export async function loadPlansFromStorage(): Promise<SavedThreadPlan[]> {
  const localList = getLocalPlans();

  try {
    const res = await getSavedThreadPlansAction();
    if (res.success && Array.isArray(res.data)) {
      const dbList = res.data;
      // 로컬에만 존재하는 로컬 전용 항목(local_ 시작)이 있다면 병합
      const localOnly = localList.filter((p) => p.id.startsWith("local_"));
      const merged = [...localOnly, ...dbList];
      setLocalPlans(merged);
      return merged;
    }
  } catch (e) {
    console.warn("DB 목록 조회 실패, 로컬 캐시를 사용합니다:", e);
  }

  return localList;
}

/**
 * 특정 글 1건 로드
 */
export async function loadPlanByIdFromStorage(id: string): Promise<SavedThreadPlan | null> {
  // 로컬에서 먼저 탐색
  const localList = getLocalPlans();
  const foundLocal = localList.find((p) => p.id === id);
  if (foundLocal) return foundLocal;

  // DB에서 탐색
  try {
    const res = await getSavedThreadPlanByIdAction(id);
    if (res.success && res.data) {
      return res.data;
    }
  } catch (e) {
    console.warn("DB 단건 조회 실패:", e);
  }

  return null;
}

/**
 * 보관함 글 삭제
 */
export async function deletePlanFromStorage(id: string): Promise<boolean> {
  // 1. 로컬 캐시에서 제거
  const current = getLocalPlans();
  const updated = current.filter((p) => p.id !== id);
  setLocalPlans(updated);

  // 2. DB 항목인 경우 Server Action 호출
  if (!id.startsWith("local_")) {
    try {
      await deleteSavedThreadPlanAction(id);
    } catch (e) {
      console.warn("DB 삭제 호출 실패:", e);
    }
  }

  return true;
}
