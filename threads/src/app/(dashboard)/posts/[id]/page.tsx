import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/posts/PostForm";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { Button } from "@/components/ui/Button";
import { deletePostAction, publishNowAction, updatePostAction } from "@/lib/actions/posts";
import { toDatetimeLocalValue } from "@/lib/date";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: post }, { data: account }] = await Promise.all([
    supabase.from("posts").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("threads_accounts").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!post) {
    notFound();
  }

  const isEditable = post.status === "draft" || post.status === "scheduled" || post.status === "failed";
  const boundUpdateAction = updatePostAction.bind(null, post.id);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">게시글 상세</h1>
        <StatusBadge status={post.status} />
      </div>

      {post.status === "failed" && post.error_message && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">게시 실패 사유</p>
          <p className="mt-1">{post.error_message}</p>
        </div>
      )}

      {post.status === "published" && post.threads_permalink && (
        <div className="mb-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          <p className="font-medium">Threads에 게시되었습니다.</p>
          <a
            href={post.threads_permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block underline"
          >
            {post.threads_permalink}
          </a>
        </div>
      )}

      {isEditable ? (
        <PostForm
          action={boundUpdateAction}
          submitLabel="저장하기"
          userId={user.id}
          initialContent={post.content}
          initialImageUrl={post.image_url ?? ""}
          initialScheduledAtLocal={toDatetimeLocalValue(post.scheduled_at)}
          initialPublishMode={post.status === "scheduled" ? "schedule" : "draft"}
          hasThreadsAccount={Boolean(account)}
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="whitespace-pre-wrap text-sm text-neutral-900">{post.content}</p>
            {post.image_url && (
              <p className="mt-2 truncate text-xs text-neutral-500">이미지: {post.image_url}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-neutral-200 pt-6">
        {isEditable && post.status !== "scheduled" && (
          <form action={publishNowAction}>
            <input type="hidden" name="postId" value={post.id} />
            <Button type="submit" variant="secondary" disabled={!account}>
              지금 게시하기
            </Button>
          </form>
        )}
        <form action={deletePostAction}>
          <input type="hidden" name="postId" value={post.id} />
          <Button type="submit" variant="danger">
            삭제
          </Button>
        </form>
      </div>
    </div>
  );
}
