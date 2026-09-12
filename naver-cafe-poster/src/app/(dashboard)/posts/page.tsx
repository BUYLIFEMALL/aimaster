import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { DeleteButton } from "@/components/posts/DeleteButton";
import { DeployButton } from "@/components/posts/DeployButton";
import { POST_STATUS_LABELS, type PostStatus } from "@/types/post";
import { deletePostAction, deployDraftAction } from "@/lib/actions/posts";

const FILTERS: Array<{ value: PostStatus | "all"; label: string }> = [
  { value: "all", label: "전체" },
  { value: "draft", label: POST_STATUS_LABELS.draft },
  { value: "published", label: POST_STATUS_LABELS.published },
  { value: "failed", label: POST_STATUS_LABELS.failed },
];

const VALID_STATUSES: readonly PostStatus[] = ["draft", "publishing", "published", "failed"];

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
    .from("ncafe_posts")
    .select("*, target:ncafe_targets(label)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (status && status !== "all" && isPostStatus(status)) {
    query = query.eq("status", status);
  }

  const [{ data: posts }, { data: account }] = await Promise.all([
    query,
    supabase.from("ncafe_accounts").select("id").eq("user_id", user.id).maybeSingle(),
  ]);
  const hasNaverAccount = Boolean(account);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">게시글 관리</h1>
        <Link href="/drafts">
          <Button>AI 글쓰기로 이동</Button>
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
                    <p className="truncate text-sm font-medium text-neutral-900">{post.title}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {(post.target as { label: string } | null)?.label ?? "카페 미지정"} ·{" "}
                      {new Date(post.created_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <StatusBadge status={post.status as PostStatus} />
                </Link>
                {/* 배포 완료/배포 중인 글은 이미 카페에 올라갔거나 올라가는 중이라 수정할 수 없다
                    (updateDraftAction이 서버에서도 동일하게 막음) — 초안/실패한 글만 "AI 글쓰기"
                    화면(/drafts)의 수정 모드로 바로 들어갈 수 있게 한다. */}
                {(post.status === "draft" || post.status === "failed") && (
                  <Link
                    href={`/drafts?edit=${post.id}`}
                    className="flex-shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                  >
                    수정
                  </Link>
                )}
                {/* /drafts 목록에만 배포 버튼이 있어서, "게시글 관리"(/posts)에서 이 글을 본 사람은
                    실제로 게시하려면 어디로 가야 할지 못 찾겠다는 지적(2026-09-12)이 있었다 —
                    여기서도 바로 배포할 수 있게 동일한 deployDraftAction을 노출한다. */}
                {(post.status === "draft" || post.status === "failed") && (
                  <form action={deployDraftAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <DeployButton
                      disabled={!hasNaverAccount || !post.target_id}
                      label={post.status === "failed" ? "다시 게시" : "게시"}
                      className="flex-shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:bg-neutral-300 disabled:text-neutral-600"
                    />
                  </form>
                )}
                <form action={deletePostAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <DeleteButton className="flex-shrink-0" />
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
