import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProductPostForm } from "@/components/posts/ProductPostForm";
import { createPostAction } from "@/lib/actions/posts";

interface NewPostPageProps {
  searchParams: Promise<{
    initialContent?: string;
    productId?: string;
    initialImageUrl?: string;
  }>;
}

export default async function NewPostPage({ searchParams }: NewPostPageProps) {
  const params = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: account }, { data: products }] = await Promise.all([
    supabase.from("tap_accounts").select("id").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("affiliate_products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">새 게시글 작성</h1>
      <ProductPostForm
        action={createPostAction}
        submitLabel="게시물 생성하기"
        userId={user.id}
        products={products ?? []}
        initialContent={params?.initialContent ?? ""}
        initialProductId={params?.productId ?? ""}
        initialImageUrl={params?.initialImageUrl ?? ""}
        hasThreadsAccount={Boolean(account)}
        aiGenerateOnSubmit
      />
    </div>
  );
}
