import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { DeleteButton } from "@/components/posts/DeleteButton";
import { POST_STATUS_LABELS, type PostStatus } from "@/types/post";
import { deletePostAction } from "@/lib/actions/posts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberSchedulerState } from "@/lib/posts/memberScheduler";
import { SchedulePublishingControl } from "@/components/posts/SchedulePublishingControl";
import { CardnewsPostsSection } from "@/components/cardnews/CardnewsPostsSection";
import { IS_STANDALONE } from "@/lib/deployment";

const FILTERS: Array<{ value: PostStatus | "all"; label: string }> = [
  { value: "all", label: "전체" },
  { value: "draft", label: POST_STATUS_LABELS.draft },
  { value: "scheduled", label: POST_STATUS_LABELS.scheduled },
  { value: "published", label: POST_STATUS_LABELS.published },
  { value: "failed", label: POST_STATUS_LABELS.failed },
];

const VALID_STATUSES: readonly PostStatus[] = ["draft", "scheduled", "publishing", "published", "failed"];

function isPostStatus(value: string): value is PostStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { status } = await searchParams;

  let query = supabase
    .from("insta_posts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (status && status !== "all" && isPostStatus(status)) {
    query = query.eq("status", status);
  }

  const [{ data: posts }, schedulerState] = await Promise.all([
    query,
    memberSchedulerState(createAdminClient() as unknown as SupabaseClient, user.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-pink-500/30 bg-gradient-to-r from-[#131822] via-[#1a1424] to-[#131822] p-6 shadow-[0_4px_25px_rgba(225,48,108,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600" />
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-lg shadow-[0_4px_12px_rgba(225,48,108,0.4)] ring-2 ring-pink-500/30">
            📸
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">게시글 관리</h1>
            <p className="mt-1 text-xs text-slate-300">인스타그램 피드 및 카드뉴스 예약·발행 현황을 실시간 관리합니다.</p>
          </div>
        </div>
        <Link href="/candidates" className="btn-3d-insta-sunset px-4 py-2.5 text-xs text-white">
          <span>+ 새 게시글 작성</span>
        </Link>
      </div>

      {/* 예약 발행 상태·전체 일시정지/재개(v1.25) — 지침 docs/SCHEDULER_POLICY.md */}
      <SchedulePublishingControl initial={schedulerState} />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value === "all" ? "/posts" : `/posts?status=${filter.value}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
              (status ?? "all") === filter.value
                ? "border border-pink-500/50 bg-gradient-to-r from-pink-500/20 via-rose-500/20 to-purple-600/20 text-pink-300 shadow-sm"
                : "border border-slate-800 bg-[#131822] text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-[#131822] overflow-hidden shadow-sm">
        {!posts || posts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <p className="text-sm text-slate-400 font-medium">등록된 게시글이 없습니다.</p>
            <p className="mt-1.5 text-slate-500">새 게시글을 작성하고 인스타그램에 자동 발행해 보세요!</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/80">
            {posts.map((post) => (
              <li key={post.id} className="flex items-center gap-3 p-4 hover:bg-[#1a202d] transition-colors">
                <Link href={`/posts/${post.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  {post.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover_image_url}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-slate-800 flex items-center justify-center text-xl border border-slate-700">
                      📸
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-200 hover:text-pink-300 transition-colors">
                      {post.caption || "(내용 없음)"}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span className="rounded-md bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 text-[11px] font-bold text-pink-400">
                        {post.post_type === "card_news" ? "카드뉴스" : "피드"}
                      </span>
                      <span>
                        {post.status === "scheduled" && post.scheduled_at
                          ? `⏰ 예약: ${new Date(post.scheduled_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`
                          : `📅 ${new Date(post.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`}
                      </span>
                    </p>
                  </div>
                  <StatusBadge status={post.status} />
                </Link>
                <form action={deletePostAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <DeleteButton className="flex-shrink-0" />
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* v1.37 병합 2단계: 카드뉴스 스튜디오 예약·게시 기록도 여기서(배포판에는 카드뉴스 표가 없어 숨김) */}
      {!IS_STANDALONE && <CardnewsPostsSection />}
    </div>
  );
}
