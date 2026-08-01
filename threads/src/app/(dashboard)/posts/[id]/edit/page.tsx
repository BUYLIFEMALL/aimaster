import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/posts/PostForm";
import { updatePostAction } from "@/lib/actions/posts";
import { toDatetimeLocalValue } from "@/lib/date";

export default async function PostEditPage({
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
  if (!isEditable) redirect(`/posts/${id}`);

  const boundUpdateAction = updatePostAction.bind(null, post.id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">게시글 수정</h1>
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
    </div>
  );
}
