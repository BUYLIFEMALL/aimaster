import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getInstaAccountForUser } from "@/lib/instagram/memberAccount";
import { PostForm } from "@/components/posts/PostForm";
import { createPostAction } from "@/lib/actions/posts";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { acceptImportImage } from "@/lib/importImage";
import { requireProgramAccess } from "@/lib/access";
import { importShopDetailImage } from "@/lib/shopDetailImport";

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
    // v1.28: 다른 프로그램(4컷 만화)에서 카드뉴스로 넘길 때 형식을 미리 고른다
    postType?: string;
    // v1.47: 감성 글귀 이미지 「인스타에 올리기」 — 회원 본인 폴더(insta-post-images/<본인>/)에 올린 첨부 이미지
    imageUrl?: string;
    // v1.53: AI 상세페이지 자동화에서 넘어온 섹션 이미지(비공개 버킷 안 위치) — 캡션 초안은 기존 caption으로 받음
    from?: string;
    shopImage?: string;
  }>;
}

export default async function NewPostPage({ searchParams }: NewPostPageProps) {
  const user = await requireUser();
  const supabase = await createClient();
  const sp = await searchParams;

  let loadedCaption = sp.caption ?? "";
  let loadedHashtags = sp.hashtags ? sp.hashtags.split(",").map((h) => h.trim()).filter(Boolean) : [];
  let loadedKeywords = sp.keywords ? sp.keywords.split(",").map((k) => k.trim()).filter(Boolean) : [];

  // candidateId나 topic이 제공된 경우 Supabase insta_candidates 테이블에서 기존 생성 콘텐츠 조회.
  // 후보 목록(CandidateList)은 캡션이 길어질 수 있어(900~1400자 이상) URL에 caption/hashtags/
  // keywords를 싣지 않고 candidateId만 넘기므로, 정상 경로에서는 항상 여기서 로드된다.
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
      loadedKeywords = cand.keywords ?? [];
    }
  }

  // v1.53: 상세페이지 섹션 이미지를 「직접 첨부」와 같은 공개 저장소로 복사해 첨부한다(쓰기 작업이라 프로그램 권한까지 확인).
  let shopImport: { url?: string; error?: string } | null = null;
  if (sp.from === "shop-detail" && sp.shopImage) {
    await requireProgramAccess();
    shopImport = await importShopDetailImage(user.id, sp.shopImage);
  }
  const importedImageUrl =
    shopImport?.url ?? acceptImportImage(sp.imageUrl, user.id, process.env.NEXT_PUBLIC_SUPABASE_URL);

  const account = await getInstaAccountForUser(supabase, user.id);

  const registeredProviders = await getRegisteredProviders(supabase, user.id);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-100">새 게시글 작성</h1>
      {shopImport?.url && (
        <p className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          📄 AI 상세페이지 자동화에서 만든 섹션 이미지 1장을 첨부했습니다. 캡션 초안은 상품명·핵심 특징으로 채웠으니, 내용과 해시태그를 다듬어 주세요.
        </p>
      )}
      {shopImport?.error && (
        <p className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          ⚠️ {shopImport.error}
        </p>
      )}
      <PostForm
        action={createPostAction}
        submitLabel="게시물 생성하기"
        mode="create"
        hasInstagramAccount={Boolean(account)}
        registeredProviders={Array.from(registeredProviders)}
        initialPostType={sp.postType === "card_news" ? "card_news" : "feed"}
        initialTopic={sp.topic ?? ""}
        initialKeywords={loadedKeywords}
        initialCaption={loadedCaption}
        initialHashtags={loadedHashtags}
        initialImageUrl={importedImageUrl ?? undefined}
      />
    </div>
  );
}
