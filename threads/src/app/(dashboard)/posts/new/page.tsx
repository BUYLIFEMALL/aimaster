import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/posts/PostForm";
import { createPostAction } from "@/lib/actions/posts";

interface NewPostPageProps {
  searchParams: Promise<{ topic?: string; keywords?: string; candidateId?: string; content?: string }>;
}

export default async function NewPostPage({ searchParams }: NewPostPageProps) {
  const user = await requireUser();
  const supabase = await createClient();
  const sp = await searchParams;

  let loadedContent = sp.content ?? "";

  // candidateId나 topic이 제공된 경우 Supabase threads_candidates 테이블에서 기존 생성 콘텐츠 조회
  if (!loadedContent && (sp.candidateId || sp.topic)) {
    let query = supabase.from("threads_candidates").select("content, keywords").eq("user_id", user.id);
    if (sp.candidateId) {
      query = query.eq("id", sp.candidateId);
    } else if (sp.topic) {
      query = query.eq("title", sp.topic);
    }
    const { data: cand } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (cand?.content) {
      loadedContent = cand.content;
    }
  }

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
        initialTopic={sp.topic ?? ""}
        initialKeywords={sp.keywords ? sp.keywords.split(",").map((k) => k.trim()).filter(Boolean) : []}
        initialContent={loadedContent}
      />
    </div>
  );
}
