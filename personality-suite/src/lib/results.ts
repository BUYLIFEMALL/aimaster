import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ScoredResult } from "@/lib/tests/types";
import type { Analysis, Profile } from "@/lib/tests/ai";

// 모든 쿼리는 service role로 실행되므로 반드시 user_id로 직접 거른다(멀티테넌시 원칙 2번).
export const MAX_RESULTS = 100;

export interface ResultRow {
  id: string;
  test_id: string;
  code: string;
  headline: string;
  result: ScoredResult;
  analysis: Analysis | null;
  created_at: string;
}
export interface ResultSummary { id: string; test_id: string; code: string; headline: string; created_at: string; hasAnalysis: boolean }

const COLS = "id, test_id, code, headline, result, analysis, created_at";
const UUID = /^[0-9a-f-]{36}$/i;

export async function listResults(userId: string): Promise<ResultSummary[]> {
  const { data } = await createAdminClient()
    .from("personality_suite_results")
    .select("id, test_id, code, headline, created_at, analysis")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MAX_RESULTS);
  return (data ?? []).map((r) => ({
    id: r.id as string, test_id: r.test_id as string, code: r.code as string, headline: r.headline as string,
    created_at: r.created_at as string, hasAnalysis: !!r.analysis,
  }));
}

export async function getResult(userId: string, id: string): Promise<ResultRow | null> {
  if (!UUID.test(id)) return null;
  const { data } = await createAdminClient().from("personality_suite_results").select(COLS).eq("user_id", userId).eq("id", id).maybeSingle();
  return (data as ResultRow | null) ?? null;
}

export async function insertResult(userId: string, testId: string, result: ScoredResult, answers: number[]): Promise<{ id: string } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("personality_suite_results")
    .insert({ user_id: userId, test_id: testId, code: result.code, headline: result.headline, result, answers })
    .select("id")
    .single();
  if (error || !data) return null;
  // 회원당 최대 개수 유지 — 오래된 결과부터 정리
  const { data: old } = await admin
    .from("personality_suite_results")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(MAX_RESULTS, MAX_RESULTS + 200);
  const ids = (old ?? []).map((r) => r.id as string);
  if (ids.length) await admin.from("personality_suite_results").delete().eq("user_id", userId).in("id", ids);
  return { id: data.id as string };
}

export async function deleteResult(userId: string, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const { error } = await createAdminClient().from("personality_suite_results").delete().eq("user_id", userId).eq("id", id);
  return !error;
}

export async function saveAnalysis(userId: string, id: string, analysis: Analysis): Promise<boolean> {
  const { error } = await createAdminClient().from("personality_suite_results").update({ analysis }).eq("user_id", userId).eq("id", id);
  return !error;
}

export interface LatestRow extends ResultRow { previous: ResultRow | null }

/** 검사마다 가장 최근 결과 1건과 그 직전 결과(종합 프로필 재료·변화 비교용) */
export async function latestPerTest(userId: string): Promise<LatestRow[]> {
  const { data } = await createAdminClient()
    .from("personality_suite_results")
    .select(COLS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MAX_RESULTS);
  const out = new Map<string, LatestRow>();
  for (const r of (data ?? []) as ResultRow[]) {
    const cur = out.get(r.test_id);
    if (!cur) out.set(r.test_id, { ...r, previous: null });
    else if (!cur.previous) cur.previous = r;
  }
  return [...out.values()];
}

/** 같은 검사의 바로 이전 결과(결과 화면의 변화 비교용) */
export async function getPreviousResult(userId: string, testId: string, beforeIso: string): Promise<ResultRow | null> {
  const { data } = await createAdminClient()
    .from("personality_suite_results")
    .select(COLS)
    .eq("user_id", userId)
    .eq("test_id", testId)
    .lt("created_at", beforeIso)
    .order("created_at", { ascending: false })
    .limit(1);
  return ((data ?? [])[0] as ResultRow | undefined) ?? null;
}

export interface StoredProfile { profile: Profile; basedOn: { testId: string; headline: string }[]; updatedAt: string }

export async function getProfile(userId: string): Promise<StoredProfile | null> {
  const { data } = await createAdminClient().from("personality_suite_profiles").select("profile, based_on, updated_at").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return { profile: data.profile as Profile, basedOn: data.based_on as StoredProfile["basedOn"], updatedAt: data.updated_at as string };
}

export async function saveProfile(userId: string, profile: Profile, basedOn: StoredProfile["basedOn"]): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("personality_suite_profiles")
    .upsert({ user_id: userId, profile, based_on: basedOn, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  return !error;
}
