import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { DeleteButton } from "@/components/posts/DeleteButton";
import { POST_STATUS_LABELS, type PostStatus } from "@/types/post";
import { deletePostAction } from "@/lib/actions/posts";
import { getRemainingRetentionTime } from "@/lib/mediaRetention";

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
    .from("tap_posts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (status && status !== "all" && isPostStatus(status)) {
    query = query.eq("status", status);
  }

  const { data: posts } = await query;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">게시글 관리</h1>
        <Link href="/posts/new">
          <Button>새 게시글 작성</Button>
        </Link>
      </div>

      {/* 30일 자동 삭제 안내 배너 */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-200/90 bg-amber-50/80 p-3.5 text-xs text-amber-950 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">⏳</span>
          <div>
            <p className="font-extrabold text-amber-950">게시글 및 미디어 자동 보관 정책</p>
            <p className="text-[11px] text-amber-800">
              게시될 글(임시저장 및 발행 글)과 첨부 미디어(이미지·영상)는 등록 시점 기준 <strong>30일 후 자동 삭제</strong>됩니다. 필요 없는 글은 각 항목의 [삭제] 버튼으로 언제든 즉시 정리할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value === "all" ? "/posts" : `/posts?status=${filter.value}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              (status ?? "all") === filter.value
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        {!posts || posts.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">게시글이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {posts.map((post) => {
              const remaining = getRemainingRetentionTime(post.created_at);
              return (
                <li key={post.id} className="flex items-center gap-3 p-4 hover:bg-neutral-50">
                  <Link href={`/posts/${post.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-neutral-900 font-medium">{post.content}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {post.status === "scheduled" && post.scheduled_at
                          ? `예약: ${new Date(post.scheduled_at).toLocaleString("ko-KR")}`
                          : `등록: ${new Date(post.created_at).toLocaleString("ko-KR")}`}
                      </p>
                    </div>
                    <StatusBadge status={post.status} />
                  </Link>

                  {/* 삭제 버튼 및 우측 남은 시점 표시 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <form action={deletePostAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <DeleteButton className="flex-shrink-0" />
                    </form>
                    <span
                      className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-bold ${
                        remaining.isUrgent
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                      }`}
                      title={`등록일: ${new Date(post.created_at).toLocaleString("ko-KR")} (30일 보관 후 자동 삭제)`}
                    >
                      {remaining.text}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
