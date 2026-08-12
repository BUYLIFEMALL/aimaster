import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/posts/PostForm";
import { SlideGallery } from "@/components/posts/SlideGallery";
import { updatePostAction } from "@/lib/actions/posts";
import { toDatetimeLocalValue } from "@/lib/date";

// "즉시 게시" 선택 시 이 페이지의 서버 액션(updatePostAction)이 publishPost()까지 호출한다.
// posts/new/page.tsx와 동일한 이유로 넉넉하게 늘린다.
export const maxDuration = 120;

export default async function PostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: post }, { data: account }, { data: slides }] = await Promise.all([
    supabase.from("insta_posts").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("insta_accounts").select("id").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("insta_post_slides")
      .select("*")
      .eq("post_id", id)
      .eq("user_id", user.id)
      .order("slide_order", { ascending: true }),
  ]);

  if (!post) notFound();

  const isEditable = post.status === "draft" || post.status === "scheduled" || post.status === "failed";
  if (!isEditable) redirect(`/posts/${id}`);

  const boundUpdateAction = updatePostAction.bind(null, post.id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">게시글 수정</h1>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-neutral-700">
          {post.post_type === "card_news" ? "카드뉴스 슬라이드" : "이미지"}
        </h2>
        <SlideGallery postId={post.id} slides={slides ?? []} />
      </div>

      <PostForm
        action={boundUpdateAction}
        submitLabel="저장하기"
        mode="edit"
        initialPostType={post.post_type}
        initialCaption={post.caption}
        initialHashtags={post.hashtags ?? []}
        initialScheduledAtLocal={toDatetimeLocalValue(post.scheduled_at)}
        initialPublishMode={post.status === "scheduled" ? "schedule" : "draft"}
        hasInstagramAccount={Boolean(account)}
      />
    </div>
  );
}
