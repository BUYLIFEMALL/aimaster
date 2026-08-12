import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/posts/PostForm";
import { createPostAction } from "@/lib/actions/posts";
import { getRegisteredProviders } from "@/lib/apiKeys";

// "즉시 게시" 선택 시 이 페이지의 서버 액션(createPostAction)이 publishPost()까지 호출한다.
// 카드뉴스(캐러셀, 최대 4장)는 이미지마다 컨테이너 생성+FINISHED 대기를 반복해 기본 실행
// 시간 제한을 넘길 수 있어 넉넉하게 늘린다.
export const maxDuration = 120;

interface NewPostPageProps {
  searchParams: Promise<{
    topic?: string;
    keywords?: string;
    candidateId?: string;
    caption?: string;
    hashtags?: string;
  }>;
}

export default async function NewPostPage({ searchParams }: NewPostPageProps) {
  const user = await requireUser();
  const supabase = await createClient();
  const sp = await searchParams;

  let loadedCaption = sp.caption ?? "";
  let loadedHashtags = sp.hashtags ? sp.hashtags.split(",").map((h) => h.trim()).filter(Boolean) : [];

  // candidateId나 topic이 제공된 경우 Supabase insta_candidates 테이블에서 기존 생성 콘텐츠 조회
  if (!loadedCaption && (sp.candidateId || sp.topic)) {
    let query = supabase.from("insta_candidates").select("caption, hashtags, keywords").eq("user_id", user.id);
    if (sp.candidateId) {
      query = query.eq("id", sp.candidateId);
    } else if (sp.topic) {
      query = query.eq("title", sp.topic);
    }
    const { data: cand } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (cand?.caption) {
      loadedCaption = cand.caption;
      loadedHashtags = cand.hashtags ?? [];
    }
  }

  const { data: account } = await supabase
    .from("insta_accounts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const registeredProviders = await getRegisteredProviders(supabase, user.id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">새 게시글 작성</h1>
      <PostForm
        action={createPostAction}
        submitLabel="게시물 생성하기"
        mode="create"
        hasInstagramAccount={Boolean(account)}
        registeredProviders={Array.from(registeredProviders)}
        initialTopic={sp.topic ?? ""}
        initialKeywords={sp.keywords ? sp.keywords.split(",").map((k) => k.trim()).filter(Boolean) : []}
        initialCaption={loadedCaption}
        initialHashtags={loadedHashtags}
      />
    </div>
  );
}
