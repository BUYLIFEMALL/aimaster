import { requireUser } from "@/lib/auth";
import { requireProgramAccess } from "@/lib/access";
import { importShopDetailImage } from "@/lib/shopDetailImport";
import { createClient } from "@/lib/supabase/server";
import { getThreadsAccountForUser } from "@/lib/threads/memberAccount";
import { ProductPostForm } from "@/components/posts/ProductPostForm";
import { createPostAction } from "@/lib/actions/posts";

interface NewPostPageProps {
  searchParams: Promise<{
    initialContent?: string;
    productId?: string;
    initialImageUrl?: string;
    // v1.81: AI 상세페이지 자동화에서 넘어온 섹션 이미지(비공개 버킷 안 위치)
    from?: string;
    shopImage?: string;
  }>;
}

export default async function NewPostPage({ searchParams }: NewPostPageProps) {
  const params = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  // v1.81: 상세페이지 섹션 이미지를 이 앱 공개 저장소로 복사해 첨부한다(쓰기 작업이라 프로그램 권한까지 확인).
  let shopImport: { url?: string; error?: string } | null = null;
  if (params?.from === "shop-detail" && params.shopImage) {
    await requireProgramAccess();
    shopImport = await importShopDetailImage(user.id, params.shopImage);
  }
  const initialImageUrl = shopImport?.url ?? params?.initialImageUrl ?? "";

  const [{ data: account }, { data: products }] = await Promise.all([
    getThreadsAccountForUser(user.id).then((data) => ({ data })),
    supabase
      .from("affiliate_products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">새 게시글 작성</h1>
      {shopImport?.url && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          📄 AI 상세페이지 자동화에서 만든 섹션 이미지 1장을 첨부했습니다. 본문 초안은 상품명·핵심 특징으로 채웠으니, 제휴 상품을 고르고 내용을 다듬어 주세요.
        </p>
      )}
      {shopImport?.error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠️ {shopImport.error}
        </p>
      )}
      <ProductPostForm
        action={createPostAction}
        submitLabel="게시물 생성하기"
        userId={user.id}
        products={products ?? []}
        initialContent={params?.initialContent ?? ""}
        initialProductId={params?.productId ?? ""}
        initialImageUrl={initialImageUrl}
        hasThreadsAccount={Boolean(account)}
        aiGenerateOnSubmit
      />
    </div>
  );
}
