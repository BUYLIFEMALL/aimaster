import type { SupabaseClient } from "@supabase/supabase-js";

const IMAGE_BUCKET = "naver-blog-seo-images";
const RETENTION_DAYS = 30;
const RETENTION_BATCH_SIZE = 500;

function getRetentionCutoff() {
  return new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export async function purgeExpiredDrafts(supabase: SupabaseClient, userId?: string) {
  const cutoff = getRetentionCutoff();
  let query = supabase.from("naver_blog_seo_drafts").select("id, image_path").lt("created_at", cutoff).limit(RETENTION_BATCH_SIZE);
  if (userId) query = query.eq("user_id", userId);
  const { data: expired, error } = await query;
  if (error || !expired?.length) return { deleted: 0, error };

  const imagePaths = expired.map((draft) => draft.image_path).filter((path): path is string => Boolean(path));
  if (imagePaths.length) await supabase.storage.from(IMAGE_BUCKET).remove(imagePaths);
  let deleteQuery = supabase.from("naver_blog_seo_drafts").delete().in("id", expired.map((draft) => draft.id));
  if (userId) deleteQuery = deleteQuery.eq("user_id", userId);
  const { error: deleteError } = await deleteQuery;
  return { deleted: deleteError ? 0 : expired.length, error: deleteError };
}

export async function purgeExpiredTitleRecommendations(supabase: SupabaseClient, userId?: string) {
  const cutoff = getRetentionCutoff();
  let query = supabase.from("naver_blog_seo_title_recommendations").select("id").lt("created_at", cutoff).limit(RETENTION_BATCH_SIZE);
  if (userId) query = query.eq("user_id", userId);
  const { data: expired, error } = await query;
  if (error || !expired?.length) return { deleted: 0, error };

  let deleteQuery = supabase.from("naver_blog_seo_title_recommendations").delete().in("id", expired.map((recommendation) => recommendation.id));
  if (userId) deleteQuery = deleteQuery.eq("user_id", userId);
  const { error: deleteError } = await deleteQuery;
  return { deleted: deleteError ? 0 : expired.length, error: deleteError };
}

export async function purgeExpiredSeoStudioData(supabase: SupabaseClient, userId?: string) {
  const [drafts, titleRecommendations] = await Promise.all([
    purgeExpiredDrafts(supabase, userId),
    purgeExpiredTitleRecommendations(supabase, userId),
  ]);
  return {
    deleted: drafts.deleted + titleRecommendations.deleted,
    draftsDeleted: drafts.deleted,
    titleRecommendationsDeleted: titleRecommendations.deleted,
    error: drafts.error ?? titleRecommendations.error,
  };
}

export const draftRetentionDays = RETENTION_DAYS;
