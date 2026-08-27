import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishPost } from "@/lib/posts/publish-core";

export interface DispatchResult {
  postId: string;
  success: boolean;
  errorMessage?: string;
}

async function dispatchDuePosts(
  supabase: SupabaseClient<Database>,
  userId?: string,
): Promise<DispatchResult[]> {
  let query = supabase
    .from("tap_posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: duePosts, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const results: DispatchResult[] = [];

  for (const post of duePosts ?? []) {
    const { data: account } = await supabase
      .from("tap_accounts")
      .select("*")
      .eq("user_id", post.user_id)
      .maybeSingle();

    if (!account) {
      await supabase
        .from("tap_posts")
        .update({ status: "failed", error_message: "연결된 Threads 계정이 없습니다." })
        .eq("id", post.id);
      results.push({ postId: post.id, success: false, errorMessage: "연결된 Threads 계정이 없습니다." });
      continue;
    }

    const outcome = await publishPost({
      supabase,
      postId: post.id,
      userId: post.user_id,
      content: post.content,
      imageUrl: post.image_url,
      threadsUserId: account.threads_user_id,
      accessToken: account.access_token,
    });

    results.push({ postId: post.id, success: outcome.success, errorMessage: outcome.errorMessage });
  }

  return results;
}

// 외부 스케줄러(cron-job.org, QStash 등)나 Supabase pg_cron이 CRON_SECRET으로 호출하는 경로.
// 모든 사용자의 예약글을 대상으로 하므로 RLS를 우회하는 admin 클라이언트를 사용합니다.
export async function dispatchAllScheduledPosts(): Promise<DispatchResult[]> {
  const supabase = createAdminClient();
  return dispatchDuePosts(supabase);
}

// 대시보드의 "예약 게시 실행" 버튼(로그인 사용자)이 호출하는 경로.
export async function dispatchScheduledPostsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<DispatchResult[]> {
  return dispatchDuePosts(supabase, userId);
}
