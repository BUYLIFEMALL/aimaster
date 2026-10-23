import type { SupabaseClient } from "@supabase/supabase-js";
import { addCleanupCount, type CleanupCounts } from "@/lib/cleanupUsageLog";

// counts(2026-10-23, 선택): 매일 크론이 실제로 지운 것을 회원별로 센다(usage_logs cleanup_expired). 회원 요청 때의 본인 정리는 넘기지 않는다.

const IMAGE_BUCKET = "naver-blog-seo-images";
const RETENTION_DAYS = 30;
const RETENTION_BATCH_SIZE = 500;

type DraftImageMetadata = {
  image_path?: unknown;
  seo_report?: unknown;
};

function getRetentionCutoff() {
  return new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function getDraftImagePaths(draft: DraftImageMetadata) {
  const paths = new Set<string>();
  if (typeof draft.image_path === "string" && draft.image_path) paths.add(draft.image_path);
  const report = typeof draft.seo_report === "object" && draft.seo_report !== null ? draft.seo_report as { contentImages?: unknown } : null;
  if (Array.isArray(report?.contentImages)) {
    for (const image of report.contentImages) {
      if (typeof image === "object" && image !== null && typeof (image as { path?: unknown }).path === "string") {
        paths.add((image as { path: string }).path);
      }
    }
  }
  return [...paths];
}

export async function purgeExpiredDrafts(supabase: SupabaseClient, userId?: string, counts?: CleanupCounts) {
  const cutoff = getRetentionCutoff();
  let query = supabase.from("naver_blog_seo_drafts").select("id, user_id, image_path, seo_report").lt("created_at", cutoff).limit(RETENTION_BATCH_SIZE);
  if (userId) query = query.eq("user_id", userId);
  const { data: expired, error } = await query;
  if (error || !expired?.length) return { deleted: 0, error };

  const imagePaths = expired.flatMap(getDraftImagePaths);
  if (imagePaths.length) {
    const { error: storageError } = await supabase.storage.from(IMAGE_BUCKET).remove([...new Set(imagePaths)]);
    if (storageError) return { deleted: 0, error: storageError };
  }
  let deleteQuery = supabase.from("naver_blog_seo_drafts").delete().in("id", expired.map((draft) => draft.id));
  if (userId) deleteQuery = deleteQuery.eq("user_id", userId);
  const { error: deleteError } = await deleteQuery;
  if (counts && !deleteError) for (const draft of expired) { addCleanupCount(counts, draft.user_id, "posts"); addCleanupCount(counts, draft.user_id, "images", getDraftImagePaths(draft).length); }
  return { deleted: deleteError ? 0 : expired.length, error: deleteError };
}

export async function purgeExpiredTitleRecommendations(supabase: SupabaseClient, userId?: string, counts?: CleanupCounts) {
  const cutoff = getRetentionCutoff();
  let query = supabase.from("naver_blog_seo_title_recommendations").select("id, user_id").lt("created_at", cutoff).limit(RETENTION_BATCH_SIZE);
  if (userId) query = query.eq("user_id", userId);
  const { data: expired, error } = await query;
  if (error || !expired?.length) return { deleted: 0, error };

  let deleteQuery = supabase.from("naver_blog_seo_title_recommendations").delete().in("id", expired.map((recommendation) => recommendation.id));
  if (userId) deleteQuery = deleteQuery.eq("user_id", userId);
  const { error: deleteError } = await deleteQuery;
  if (counts && !deleteError) for (const row of expired) addCleanupCount(counts, row.user_id, "titles");
  return { deleted: deleteError ? 0 : expired.length, error: deleteError };
}

// BLC-08a (2026-10-22): 「자료부터 집필」 자료·근거도 만든 날 기준 30일 뒤 삭제한다.
export async function purgeExpiredResearch(supabase: SupabaseClient, userId?: string, counts?: CleanupCounts) {
  let query = supabase.from("naver_blog_seo_research").delete().lt("created_at", getRetentionCutoff());
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.select("id, user_id");
  if (counts && !error) for (const row of data ?? []) addCleanupCount(counts, row.user_id, "research");
  return { deleted: error ? 0 : data?.length ?? 0, error };
}

// BLC-08b (2026-10-22): 본인 문체 자료·분석도 만든 날 기준 30일 뒤 삭제한다.
export async function purgeExpiredStyles(supabase: SupabaseClient, userId?: string, counts?: CleanupCounts) {
  let query = supabase.from("naver_blog_seo_styles").delete().lt("created_at", getRetentionCutoff());
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.select("id, user_id");
  if (counts && !error) for (const row of data ?? []) addCleanupCount(counts, row.user_id, "styles");
  return { deleted: error ? 0 : data?.length ?? 0, error };
}

// BLC-09 (2026-10-22): 「구간별로 쓰기」 목차·구간 본문도 30일 뒤 삭제.
export async function purgeExpiredOutlines(supabase: SupabaseClient, userId?: string, counts?: CleanupCounts) {
  let query = supabase.from("naver_blog_seo_outlines").delete().lt("created_at", getRetentionCutoff());
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.select("id, user_id");
  if (counts && !error) for (const row of data ?? []) addCleanupCount(counts, row.user_id, "outlines");
  return { deleted: error ? 0 : data?.length ?? 0, error };
}

export async function purgeExpiredSeoStudioData(supabase: SupabaseClient, userId?: string, counts?: CleanupCounts) {
  const [drafts, titleRecommendations, research, styles, outlines] = await Promise.all([
    purgeExpiredDrafts(supabase, userId, counts),
    purgeExpiredTitleRecommendations(supabase, userId, counts),
    purgeExpiredResearch(supabase, userId, counts),
    purgeExpiredStyles(supabase, userId, counts),
    purgeExpiredOutlines(supabase, userId, counts),
  ]);
  return {
    deleted: drafts.deleted + titleRecommendations.deleted + research.deleted + styles.deleted + outlines.deleted,
    draftsDeleted: drafts.deleted,
    titleRecommendationsDeleted: titleRecommendations.deleted,
    researchDeleted: research.deleted,
    stylesDeleted: styles.deleted,
    outlinesDeleted: outlines.deleted,
    error: drafts.error ?? titleRecommendations.error ?? research.error ?? styles.error ?? outlines.error,
  };
}

export const draftRetentionDays = RETENTION_DAYS;
