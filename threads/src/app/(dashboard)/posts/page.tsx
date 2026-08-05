import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { POST_STATUS_LABELS, type PostStatus } from "@/types/post";
import { deletePostAction } from "@/lib/actions/posts";

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
    .from("posts")
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
            {posts.map((post) => (
              <li key={post.id} className="flex items-center gap-2 p-4 hover:bg-neutral-50">
                <Link href={`/posts/${post.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-900">{post.content}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {post.status === "scheduled" && post.scheduled_at
                        ? `예약: ${new Date(post.scheduled_at).toLocaleString("ko-KR")}`
                        : new Date(post.created_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <StatusBadge status={post.status} />
                </Link>
                <form action={deletePostAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <button
                    type="submit"
                    className="flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
