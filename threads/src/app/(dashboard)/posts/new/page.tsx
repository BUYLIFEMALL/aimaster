import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/posts/PostForm";
import { createPostAction } from "@/lib/actions/posts";

export default async function NewPostPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("threads_accounts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">새 게시글 작성</h1>
      <PostForm
        action={createPostAction}
        submitLabel="생성하기"
        userId={user.id}
        hasThreadsAccount={Boolean(account)}
        aiGenerateOnSubmit
      />
    </div>
  );
}
