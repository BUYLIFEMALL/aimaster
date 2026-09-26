import type { SupabaseClient } from "@supabase/supabase-js";

const IMAGE_BUCKET = "naver-blog-seo-images";
const RETENTION_DAYS = 30;

export async function purgeExpiredDrafts(supabase: SupabaseClient, userId?: string) {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let query = supabase.from("naver_blog_seo_drafts").select("id, image_path").lt("created_at", cutoff).limit(500);
  if (userId) query = query.eq("user_id", userId);
  const { data: expired, error } = await query;
  if (error || !expired?.length) return { deleted: 0, error };

  const imagePaths = expired.map((draft) => draft.image_path).filter((path): path is string => Boolean(path));
  if (imagePaths.length) await supabase.storage.from(IMAGE_BUCKET).remove(imagePaths);
  let deleteQuery = supabase.from("naver_blog_seo_drafts").delete().lt("created_at", cutoff);
  if (userId) deleteQuery = deleteQuery.eq("user_id", userId);
  const { error: deleteError } = await deleteQuery;
  return { deleted: deleteError ? 0 : expired.length, error: deleteError };
}

export const draftRetentionDays = RETENTION_DAYS;
