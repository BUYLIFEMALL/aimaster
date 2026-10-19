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

interface DispatchOptions {
  /** 이 회원의 글만(대시보드 버튼·회원 cron-job.org 실행) */
  userId?: string;
  /** 운영자(Vercel) 실행에서 제외할 회원: cron-job.org를 고른 회원·일시정지 회원 (v1.63) */
  excludeUserIds?: string[];
  /** Vercel 방식이 꺼진 사이트에서 운영자 실행이 Vercel 회원 글을 만나면 발행하지 않고 이 안내로 실패 처리 (v1.63) */
  failWithMessage?: string;
  /** 회원 전용 실행(외부 호출)에도 핸드폰 번호 필수 정책 적용 (v1.63) */
  enforcePhone?: boolean;
}

async function dispatchDuePosts(
  supabase: SupabaseClient<Database>,
  options: DispatchOptions = {},
): Promise<DispatchResult[]> {
  const { userId } = options;
  let query = supabase
    .from("tap_posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  if (userId) {
    query = query.eq("user_id", userId);
  }
  if (options.excludeUserIds?.length) {
    query = query.not("user_id", "in", `(${options.excludeUserIds.join(",")})`);
  }

  const { data: duePosts, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const results: DispatchResult[] = [];

  // 핸드폰 번호 필수 정책(2026-10-12): 외부 스케줄러가 전체 회원 대상으로 호출할 때는 번호가 없는 회원의 예약글을 올리지 않는다.
  const phoneOkUsers = userId && !options.enforcePhone ? null : await phoneRegisteredUserIds(supabase, (duePosts ?? []).map((p) => p.user_id));
  for (const post of (duePosts ?? []).filter((p) => !phoneOkUsers || phoneOkUsers.has(p.user_id))) {
    // 중복 발행 방지(v1.63): 운영자 Vercel 호출·회원 cron-job.org 호출·대시보드 버튼이 겹쳐도
    // scheduled → publishing을 "먼저 가져간" 실행만 발행한다(조건부 update).
    const { data: claimed } = await supabase
      .from("tap_posts")
      .update({ status: "publishing", error_message: null })
      .eq("id", post.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    if (options.failWithMessage) {
      await supabase.from("tap_posts").update({ status: "failed", error_message: options.failWithMessage }).eq("id", post.id);
      results.push({ postId: post.id, success: false, errorMessage: options.failWithMessage });
      continue;
    }

    const { data: account } = await supabase
      .from("tap_accounts")
      .select("*")
      .eq("user_id", post.user_id)
      .maybeSingle();

    if (!account || !account.access_token) {
      await supabase
        .from("tap_posts")
        .update({ status: "failed", error_message: "연결된 Threads 계정이 없거나 토큰이 올바르지 않습니다." })
        .eq("id", post.id);
      results.push({ postId: post.id, success: false, errorMessage: "연결된 Threads 계정이 없거나 토큰이 올바르지 않습니다." });
      continue;
    }

    let activeToken = account.access_token;

    // 토큰 갱신 시도 (최근 갱신일이 30일 이상 지난 경우 자동 토큰 연장)
    try {
      const updatedAtTime = account.updated_at ? new Date(account.updated_at).getTime() : 0;
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - updatedAtTime > thirtyDaysMs) {
        const { refreshLongLivedToken } = await import("@/lib/threads/client");
        const refreshed = await refreshLongLivedToken(account.access_token);
        if (refreshed.access_token) {
          activeToken = refreshed.access_token;
          await supabase
            .from("tap_accounts")
            .update({
              access_token: refreshed.access_token,
              updated_at: new Date().toISOString(),
            })
            .eq("id", account.id);
        }
      }
    } catch {
      // 갱신 실패 시 기존 토큰으로 게시 시도
    }

    const outcome = await publishPost({
      supabase,
      postId: post.id,
      userId: post.user_id,
      content: post.content,
      imageUrl: post.image_url,
      videoUrl: post.video_url,
      threadsUserId: account.threads_user_id,
      accessToken: activeToken,
    });

    results.push({ postId: post.id, success: outcome.success, errorMessage: outcome.errorMessage });
  }

  return results;
}

// 외부 스케줄러(cron-job.org, QStash 등)나 Supabase pg_cron이 CRON_SECRET으로 호출하는 경로.
// 모든 사용자의 예약글을 대상으로 하므로 RLS를 우회하는 admin 클라이언트를 사용합니다.
export async function dispatchAllScheduledPosts(options: Pick<DispatchOptions, "excludeUserIds" | "failWithMessage"> = {}): Promise<DispatchResult[]> {
  const supabase = createAdminClient();
  return dispatchDuePosts(supabase, options);
}

// 회원 본인 cron-job.org가 회원 전용 토큰으로 부르는 경로(v1.63): 그 회원의 예약글만. 핸드폰 정책도 적용.
export async function dispatchMemberScheduledPosts(userId: string): Promise<DispatchResult[]> {
  const supabase = createAdminClient();
  return dispatchDuePosts(supabase, { userId, enforcePhone: true });
}

// 대시보드의 "예약 게시 실행" 버튼(로그인 사용자)이 호출하는 경로.
export async function dispatchScheduledPostsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<DispatchResult[]> {
  return dispatchDuePosts(supabase, { userId });
}
