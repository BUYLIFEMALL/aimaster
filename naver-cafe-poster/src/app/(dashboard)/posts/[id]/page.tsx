import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { Button } from "@/components/ui/Button";
import { deletePostAction, deployDraftAction } from "@/lib/actions/posts";
import { DeleteButton } from "@/components/posts/DeleteButton";
import { DeployButton } from "@/components/posts/DeployButton";
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
          {post.video_url && (
            <video src={post.video_url} controls className="mt-3 max-h-64 rounded-lg border border-neutral-200" />
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
        {/* 배포 완료/배포 중인 글은 이미 카페에 올라갔거나 올라가는 중이라 수정할 수 없다
            (updateDraftAction이 서버에서도 동일하게 막음) — 초안/실패한 글만 수정 가능. */}
        {(status === "draft" || status === "failed") && (
          <Link href={`/drafts?edit=${post.id}`}>
            <Button type="button" variant="secondary">
              AI 글쓰기에서 수정
            </Button>
          </Link>
        )}
        {/* /drafts 목록에만 배포 버튼이 있어서, 상세 화면에서 이 글을 본 사람은 실제로 게시하려면
            어디로 가야 할지 못 찾겠다는 지적(2026-09-12)이 있었다 — draft 상태도 여기서 바로
            배포할 수 있게 한다(이전엔 failed 상태의 재게시만 지원했음). */}
        {(status === "draft" || status === "failed") && (
          <form action={deployDraftAction}>
            <input type="hidden" name="postId" value={post.id} />
            <DeployButton
              disabled={!account || !post.target_id}
              label={status === "failed" ? "다시 게시하기" : "검수 완료 · 게시"}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-700 disabled:bg-neutral-300 disabled:text-neutral-600"
            />
          </form>
        )}
        <form action={deletePostAction}>
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="redirectTo" value="/posts" />
          <DeleteButton variant="solid" />
        </form>
      </div>

      {(status === "draft" || status === "failed") && !account && (
        <p className="mt-2 text-xs text-red-600">
          네이버 계정이 연결되어 있지 않아 게시할 수 없습니다. 계정 연결 후 이용해주세요.
        </p>
      )}
      {(status === "draft" || status === "failed") && account && !post.target_id && (
        <p className="mt-2 text-xs text-red-600">
          등록할 카페가 지정되어 있지 않습니다. "AI 글쓰기에서 수정"에서 카페를 선택해주세요.
        </p>
      )}
    </div>
  );
}
