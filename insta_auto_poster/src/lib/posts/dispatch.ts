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
    .from("insta_posts")
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
      .from("insta_accounts")
      .select("*")
      .eq("user_id", post.user_id)
      .maybeSingle();

    if (!account) {
      await supabase
        .from("insta_posts")
        .update({ status: "failed", error_message: "연결된 인스타그램 계정이 없습니다." })
        .eq("id", post.id);
      results.push({ postId: post.id, success: false, errorMessage: "연결된 인스타그램 계정이 없습니다." });
      continue;
    }

    const outcome = await publishPost({
      supabase,
      postId: post.id,
      userId: post.user_id,
      caption: post.caption,
      hashtags: post.hashtags ?? [],
      igUserId: account.ig_user_id,
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
// 로그인한 사용자 소유의 예약글만 처리해야 하므로, 반드시 RLS가 적용된
// 세션 기반 클라이언트(server.ts의 createClient())를 전달해야 합니다.
export async function dispatchScheduledPostsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<DispatchResult[]> {
  return dispatchDuePosts(supabase, userId);
}
