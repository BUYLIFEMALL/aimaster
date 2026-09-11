import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { Button } from "@/components/ui/Button";
import { deletePostAction, deployDraftAction } from "@/lib/actions/posts";
import { DeleteButton } from "@/components/posts/DeleteButton";
import type { PostStatus } from "@/types/post";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: post }, { data: account }] = await Promise.all([
    supabase.from("ncafe_posts").select("*, target:ncafe_targets(label)").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("ncafe_accounts").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!post) notFound();

  const status = post.status as PostStatus;
  const target = post.target as { label: string } | null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">게시글 결과</h1>
        <StatusBadge status={status} />
      </div>

      {status === "failed" && post.error_message && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">게시 실패 사유</p>
          <p className="mt-1">{post.error_message}</p>
        </div>
      )}

      {status === "published" && (
        <div className="mb-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          <p className="font-medium">네이버 카페에 게시되었습니다.</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="p-5">
          <p className="mb-1 text-xs text-neutral-500">{target?.label ?? "카페 미지정"}</p>
          <h2 className="text-lg font-semibold text-neutral-900">{post.title}</h2>
          {post.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image_url}
              alt="대표 이미지"
              className="mt-3 max-h-64 rounded-lg border border-neutral-200"
            />
          )}
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-900">
            {post.content}
          </p>
          <p className="mt-3 text-xs text-neutral-400">
            {new Date(post.created_at).toLocaleString("ko-KR")}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-6">
        {status === "failed" && (
          <>
            <Link href={`/drafts?edit=${post.id}`}>
              <Button type="button" variant="secondary">
                AI 글쓰기에서 수정
              </Button>
            </Link>
            <form action={deployDraftAction}>
              <input type="hidden" name="postId" value={post.id} />
              <Button type="submit" disabled={!account || !post.target_id}>
                다시 게시하기
              </Button>
            </form>
          </>
        )}
        <form action={deletePostAction}>
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="redirectTo" value="/posts" />
          <DeleteButton variant="solid" />
        </form>
      </div>

      {status === "failed" && !account && (
        <p className="mt-2 text-xs text-red-600">
          네이버 계정이 연결되어 있지 않아 다시 게시할 수 없습니다. 계정 연결 후 이용해주세요.
        </p>
      )}
      {status === "failed" && account && !post.target_id && (
        <p className="mt-2 text-xs text-red-600">
          등록할 카페가 지정되어 있지 않습니다. "AI 글쓰기에서 수정"에서 카페를 선택해주세요.
        </p>
      )}
    </div>
  );
}
