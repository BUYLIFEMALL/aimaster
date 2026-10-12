import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishPost } from "@/lib/posts/publish-core";

/** 핸드폰 번호 필수 정책(2026-10-12): 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않는다. 루트 lib/utils/phone.ts 와 같은 규칙. */
async function phoneRegisteredUserIds(client: unknown, userIds: string[]): Promise<Set<string>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return new Set();
  const { data } = await (client as { from: (t: string) => any }).from("profiles").select("id, is_admin, phone").in("id", ids); // eslint-disable-line @typescript-eslint/no-explicit-any
  return new Set(
    ((data ?? []) as { id: string; is_admin: boolean | null; phone: string | null }[])
      .filter((p) => p.is_admin || /^01[016789]\d{7,8}$/.test(String(p.phone ?? "").replace(/[^0-9]/g, "")))
      .map((p) => p.id)
  );
}

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

  // 핸드폰 번호 필수 정책(2026-10-12): 외부 스케줄러가 전체 회원 대상으로 호출할 때는 번호가 없는 회원의 예약글을 올리지 않는다.
  const phoneOkUsers = userId ? null : await phoneRegisteredUserIds(supabase, (duePosts ?? []).map((p) => p.user_id));
  for (const post of (duePosts ?? []).filter((p) => !phoneOkUsers || phoneOkUsers.has(p.user_id))) {
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
      authMethod: account.auth_method,
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
