import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { Button } from "@/components/ui/Button";
import { deletePostAction, publishNowAction } from "@/lib/actions/posts";
import { DeleteButton } from "@/components/posts/DeleteButton";

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

  if (!post) notFound();

  const isEditable = post.status === "draft" || post.status === "scheduled" || post.status === "failed";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">게시글 결과</h1>
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

      {post.status === "scheduled" && post.scheduled_at && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          예약 게시 시각: {new Date(post.scheduled_at).toLocaleString("ko-KR")}
        </div>
      )}

      {/* 완성된 게시글 + 이미지 미리보기 (실제 Threads에 보이는 모습과 유사하게) */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt="게시글 이미지"
            className="max-h-[420px] w-full object-cover"
          />
        )}
        <div className="p-5">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-900">
            {post.content}
          </p>
          {post.video_filename && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
              🎬 동영상 첨부: {post.video_filename}
            </span>
          )}
          <p className="mt-3 text-xs text-neutral-400">
            {new Date(post.created_at).toLocaleString("ko-KR")}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-6">
        {isEditable && (
          <Link href={`/posts/${post.id}/edit`}>
            <Button type="button" variant="secondary">
              수정하기
            </Button>
          </Link>
        )}
        {isEditable && post.status !== "scheduled" && (
          <form action={publishNowAction}>
            <input type="hidden" name="postId" value={post.id} />
            <Button type="submit" disabled={!account}>
              지금 게시하기
            </Button>
          </form>
        )}
        <form action={deletePostAction}>
          <input type="hidden" name="postId" value={post.id} />
          <DeleteButton variant="solid" />
        </form>
      </div>

      {isEditable && post.status !== "scheduled" && !account && (
        <p className="mt-2 text-xs text-red-600">
          Threads 계정이 연결되어 있지 않아 즉시 게시할 수 없습니다. 계정 연결 후 이용해주세요.
        </p>
      )}
    </div>
  );
}
