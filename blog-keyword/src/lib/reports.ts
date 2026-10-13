import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnalysisResult, Feature, ReportSummary } from "@/lib/kw/types";
import { isFeature } from "@/lib/kw/types";

// 분석 기록: 회원당 최대 100건(즐겨찾기는 한도에서 제외). 서버는 service role이므로 모든 쿼리에서 user_id로 직접 거른다.
export const MAX_REPORTS = 100;
const TABLE = "blog_keyword_reports";

export interface ReportRow extends ReportSummary { params: Record<string, unknown>; result: AnalysisResult }

export async function saveReport(userId: string, feature: Feature, keyword: string, params: Record<string, unknown>, result: AnalysisResult): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(TABLE)
    .insert({ user_id: userId, feature, keyword, params, result })
    .select("id")
    .single();
  if (error || !data) return null;
  await prune(userId);
  return data.id as string;
}

/** 즐겨찾기가 아닌 기록이 한도를 넘으면 오래된 것부터 지운다 */
async function prune(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from(TABLE)
    .select("id")
    .eq("user_id", userId)
    .eq("favorite", false)
    .order("created_at", { ascending: false })
    .range(MAX_REPORTS, MAX_REPORTS + 200);
  const ids = (data ?? []).map((r) => r.id as string);
  if (ids.length) await admin.from(TABLE).delete().eq("user_id", userId).in("id", ids);
}

export async function listReports(userId: string): Promise<ReportSummary[]> {
  const { data } = await createAdminClient()
    .from(TABLE)
    .select("id, feature, keyword, favorite, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MAX_REPORTS + 50);
  return (data ?? []).filter((r) => isFeature(r.feature)) as ReportSummary[];
}

export async function loadReport(userId: string, id: string): Promise<ReportRow | null> {
  const { data } = await createAdminClient()
    .from(TABLE)
    .select("id, feature, keyword, favorite, created_at, params, result")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || !isFeature(data.feature)) return null;
  return data as unknown as ReportRow;
}

export async function updateResult(userId: string, id: string, result: AnalysisResult): Promise<boolean> {
  const { error, count } = await createAdminClient()
    .from(TABLE)
    .update({ result }, { count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);
  return !error && (count ?? 0) > 0;
}

export async function setFavorite(userId: string, id: string, favorite: boolean): Promise<boolean> {
  const { error, count } = await createAdminClient()
    .from(TABLE)
    .update({ favorite }, { count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);
  return !error && (count ?? 0) > 0;
}

export async function deleteReport(userId: string, id: string): Promise<boolean> {
  const { error } = await createAdminClient().from(TABLE).delete().eq("id", id).eq("user_id", userId);
  return !error;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}
