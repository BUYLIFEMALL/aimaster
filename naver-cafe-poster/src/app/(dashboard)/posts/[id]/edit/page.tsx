import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PostEditForm } from "@/components/posts/PostEditForm";

export default async function PostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: post }, { data: targets }] = await Promise.all([
    supabase.from("ncafe_posts").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase
      .from("ncafe_targets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!post) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">게시글 수정</h1>
        <p className="mt-1 text-sm text-neutral-600">
          내용을 수정한 뒤 "수정 내용 다시 등록"을 누르면 바로 카페에 게시됩니다.
        </p>
      </div>

      {post.status === "publishing" ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
          게시가 진행 중인 글은 수정할 수 없습니다. 완료된 뒤 다시 시도해주세요.
          <div className="mt-3">
            <Link href={`/posts/${post.id}`} className="text-sm font-medium text-neutral-900 underline">
              게시글 상세로 돌아가기
            </Link>
          </div>
        </div>
      ) : (
        <PostEditForm post={post} targets={targets ?? []} />
      )}
    </div>
  );
}
