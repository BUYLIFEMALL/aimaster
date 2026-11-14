"use client";

import type { SavedThreadPlan, HookVariant } from "@/types/planner";
import {
  saveThreadPlanAction,
  getSavedThreadPlansAction,
  getSavedThreadPlanByIdAction,
  deleteSavedThreadPlanAction,
  type SavePlanInput,
} from "@/lib/actions/savedPlans";
import { createClient } from "@/lib/supabase/client";

// 2026-11-13: 브라우저 임시 저장을 회원별로 나눈다(같은 PC를 여러 회원이 쓰면 다른 회원 글이 보이던 문제 — 회원 자료 격리 규칙).
// 예전 공용 이름(LEGACY_KEY)은 처음 한 번, 지금 로그인한 회원 칸으로 옮긴다(2026-11-14 주인님 결정 「지금 로그인한 회원 것으로 옮기기」).
// 옮기는 것은 서버에 저장되지 못한 글(id가 local_로 시작)만 — 서버에 있는 글은 DB에서 본인 것만 다시 불러오므로 옮기지 않는다.
const LEGACY_KEY = "tep_saved_plans_local_cache";
const LOCAL_STORAGE_PREFIX = "tep_saved_plans_local_cache:";
let currentUserId: string | null = null;

/** 로그인한 회원 ID를 읽어 저장 이름을 정한다. 로그인 안 됐으면 null — 그때는 브라우저 저장을 쓰지 않는다. */
async function resolveUserKey(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const { data } = await createClient().auth.getUser();
    currentUserId = data.user?.id ?? null;
  } catch {
    currentUserId = null;
  }
  migrateLegacyCache();
  return currentUserId;
}

/** 예전 공용 저장분 중 서버에 없는 글(local_)만 지금 회원 칸으로 옮기고 예전 이름은 지운다. 로그인 전이면 그대로 둔다. */
function migrateLegacyCache() {
  const key = localKey();
  if (typeof window === "undefined" || !key) return;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw === null) return;
    const legacy = JSON.parse(raw);
    const moving: SavedThreadPlan[] = Array.isArray(legacy)
      ? legacy.filter((p) => p && typeof p === "object" && typeof p.id === "string" && p.id.startsWith("local_") && p.topic)
      : [];
    if (moving.length) {
      const mineRaw = localStorage.getItem(key);
      const mine: SavedThreadPlan[] = mineRaw ? JSON.parse(mineRaw) : [];
      const ids = new Set(mine.map((p) => p.id));
      localStorage.setItem(key, JSON.stringify([...moving.filter((p) => !ids.has(p.id)), ...mine]));
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // 옮기지 못하면 예전 이름을 그대로 둔다(다음에 다시 시도)
  }
}

function localKey(): string | null {
  return currentUserId ? `${LOCAL_STORAGE_PREFIX}${currentUserId}` : null;
}
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
  const key = localKey();
  if (typeof window === "undefined" || !key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    const valid: SavedThreadPlan[] = list.filter(
      (p) => p && typeof p === "object" && p.topic && !isPlanExpired(p.created_at)
    );
    if (valid.length !== list.length) {
      setLocalPlans(valid);
    }
    return valid;
  } catch {
    return [];
  }
}

function setLocalPlans(plans: SavedThreadPlan[]) {
  const key = localKey();
  if (typeof window === "undefined" || !key) return;
  try {
    localStorage.setItem(key, JSON.stringify(plans));
  } catch {
    // ignore quota errors
  }
}

/**
 * 콘텐츠 보관함에 글 저장 (DB 우선 + 로컬 백업 보장)
 */
export async function savePlanToStorage(input: SavePlanInput): Promise<{
  success: boolean;
  data?: SavedThreadPlan;
  isLocalOnly?: boolean;
  error?: string;
}> {
  await resolveUserKey();
  let dbPlan: SavedThreadPlan | null = null;

  // 1. Server Action (DB 저장 시도)
  try {
    const res = await saveThreadPlanAction(input);
    if (res.success && res.data) {
      dbPlan = res.data;
    }
  } catch (e) {
    console.warn("DB 저장 실패, 로컬 저장소로 자동 백업합니다:", e);
  }

  // DB 저장이 성공한 경우 로컬 캐시 동기화 후 반환
  if (dbPlan) {
    const local = getLocalPlans().filter((p) => p.id !== dbPlan!.id);
    setLocalPlans([dbPlan, ...local]);
    return { success: true, data: dbPlan, isLocalOnly: false };
  }

  // 2. Fallback: 로컬 스토리지에 저장(로그인한 회원 이름으로만)
  if (!localKey()) return { success: false, error: "로그인 정보를 확인하지 못해 저장하지 못했습니다. 새로고침 후 다시 시도해 주세요." };
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
      image_urls: input.imageUrls || [],
      created_at: nowIso,
      updated_at: nowIso,
    };

    const current = getLocalPlans().filter((p) => p.id !== newId);
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
  await resolveUserKey();
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
  await resolveUserKey();
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
  await resolveUserKey();
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
