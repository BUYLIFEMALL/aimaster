import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MemberAiKeys } from "@/litpage/server/ai/providers/config.ts";

/**
 * U3(플랜 docs/PLAN_20261024_U3_MEMBER_AI_KEYS.md): 이 회원 본인의 AI 키만 공용 표 user_api_keys에서 읽는다.
 * - 최상위 규칙: 다른 회원·운영자 키로 대신하지 않는다. 없으면 빈 객체 → AI는 「본인 키를 등록해 주세요」 안내.
 * - 키 값은 기록(로그)에 남기지 않는다.
 * - 회원별 60초 메모리 캐시: 키를 바꾸거나 지우면 1분 안에 반영된다.
 * - 여러 키가 있으면 「자동」은 Claude(anthropic) → OpenAI → Gemini 순서(U4: 회원이 모델을 직접 고르면 그 회사 키를 씀).
 */
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; keys: MemberAiKeys }>();

export async function loadMemberAiKeys(userId: string): Promise<MemberAiKeys> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.keys;
  const { data, error } = await createAdminClient()
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", userId)
    .in("provider", ["anthropic", "openai", "gemini"]);
  if (error) throw new Error("본인 AI 키 등록 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  const keys: MemberAiKeys = {};
  for (const row of data ?? []) {
    const value = typeof row.api_key === "string" ? row.api_key.trim() : "";
    if (!value) continue;
    if (row.provider === "anthropic") keys.anthropicKey = value;
    if (row.provider === "openai") keys.openaiKey = value;
    if (row.provider === "gemini") keys.geminiKey = value;
  }
  if (keys.anthropicKey) keys.provider = "anthropic";
  else if (keys.openaiKey) keys.provider = "openai";
  else if (keys.geminiKey) keys.provider = "gemini";
  cache.set(userId, { at: Date.now(), keys });
  return keys;
}

export function hasMemberAiKey(keys: MemberAiKeys): boolean {
  return !!(keys.anthropicKey || keys.openaiKey || keys.geminiKey);
}

/** 키 등록·삭제 직후 바로 반영되게 캐시를 지운다(키 등록 화면에서 호출). */
export function forgetMemberAiKeys(userId: string) {
  cache.delete(userId);
}
