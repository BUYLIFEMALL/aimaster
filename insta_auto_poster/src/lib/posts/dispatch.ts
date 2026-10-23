import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishPost } from "@/lib/posts/publish-core";
import { IS_STANDALONE } from "@/lib/deployment";
import { getInstaAccountForUser } from "@/lib/instagram/memberAccount";

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
  /** 운영자(Vercel) 실행에서 제외할 회원: cron-job.org를 고른 회원·일시정지 회원 (v1.25) */
  excludeUserIds?: string[];
  /** Vercel 방식이 꺼진 사이트에서 운영자 실행이 Vercel 회원 글을 만나면 발행하지 않고 이 안내로 실패 처리 (v1.25) */
  failWithMessage?: string;
  /** 회원 전용 실행(외부 호출)에도 핸드폰 번호 필수 정책 적용 — 운영에서만 (v1.25) */
  enforcePhone?: boolean;
}

/** 장애 뒤 오래 밀린 예약이 갑자기 올라가지 않도록, 예약 시각이 24시간 넘게 지난 글은 올리지 않는다(v1.25, 지침 docs/SCHEDULER_POLICY.md). */
const MAX_LATE_MS = 24 * 60 * 60 * 1000;
const TOO_LATE_MESSAGE = "예약 시각이 24시간 넘게 지나 자동으로 올리지 않았습니다. 내용을 확인하고 다시 예약하거나 직접 게시해 주세요.";

async function dispatchDuePosts(
  supabase: SupabaseClient<Database>,
  options: DispatchOptions = {},
): Promise<DispatchResult[]> {
  const { userId } = options;
  let query = supabase
    .from("insta_posts")
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
  // 독립 운영 모드(강의용 설치 키트, 2026-10-18)는 핸드폰 입력 화면이 없으므로 이 조건을 적용하지 않는다.
  const phoneOkUsers = (userId && !options.enforcePhone) || IS_STANDALONE ? null : await phoneRegisteredUserIds(supabase, (duePosts ?? []).map((p) => p.user_id));
  for (const post of (duePosts ?? []).filter((p) => !phoneOkUsers || phoneOkUsers.has(p.user_id))) {
    // 중복 발행 방지(v1.25): 운영자 Vercel 호출·회원 cron-job.org 호출·대시보드 버튼이 겹쳐도
    // scheduled → publishing을 "먼저 가져간" 실행만 발행한다(조건부 update).
    const { data: claimed } = await supabase
      .from("insta_posts")
      .update({ status: "publishing", error_message: null })
      .eq("id", post.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const lateMessage = post.scheduled_at && Date.now() - new Date(post.scheduled_at).getTime() > MAX_LATE_MS ? TOO_LATE_MESSAGE : null;
    const skipMessage = options.failWithMessage ?? lateMessage;
    if (skipMessage) {
      await supabase.from("insta_posts").update({ status: "failed", error_message: skipMessage }).eq("id", post.id);
      results.push({ postId: post.id, success: false, errorMessage: skipMessage });
      continue;
    }

    // v1.30: 공용 연결 계정(게시 권한 있는 것) → 없으면 insta_accounts
    const account = await getInstaAccountForUser(supabase, post.user_id);

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

// 운영자 Vercel 예약 호출(CRON_SECRET)이 부르는 경로. 모든 회원의 예약글이 대상이라 RLS를 우회하는 admin 클라이언트를 쓰고,
// v1.25부터 cron-job.org를 고른 회원·일시정지 회원은 제외한다(그 회원들은 회원 전용 실행 주소가 처리).
export async function dispatchAllScheduledPosts(options: Pick<DispatchOptions, "excludeUserIds" | "failWithMessage"> = {}): Promise<DispatchResult[]> {
  const supabase = createAdminClient();
  return dispatchDuePosts(supabase, options);
}

// 회원 본인 cron-job.org가 회원 전용 토큰으로 부르는 경로(v1.25): 그 회원의 예약글만. 운영에서는 핸드폰 정책도 적용.
export async function dispatchMemberScheduledPosts(userId: string): Promise<DispatchResult[]> {
  const supabase = createAdminClient();
  return dispatchDuePosts(supabase, { userId, enforcePhone: true });
}

// 대시보드의 "예약 게시 실행" 버튼(로그인 사용자)이 호출하는 경로.
// 로그인한 사용자 소유의 예약글만 처리해야 하므로, 반드시 RLS가 적용된
// 세션 기반 클라이언트(server.ts의 createClient())를 전달해야 합니다.
export async function dispatchScheduledPostsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<DispatchResult[]> {
  return dispatchDuePosts(supabase, { userId });
}
