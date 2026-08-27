import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProductPostForm } from "@/components/posts/ProductPostForm";
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

  const [{ data: post }, { data: account }, { data: products }] = await Promise.all([
    supabase.from("tap_posts").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("tap_accounts").select("id").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("affiliate_products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!post) notFound();

  const isEditable = post.status === "draft" || post.status === "scheduled" || post.status === "failed";
  if (!isEditable) redirect(`/posts/${id}`);

  const boundUpdateAction = updatePostAction.bind(null, post.id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">게시글 수정</h1>
      <ProductPostForm
        action={boundUpdateAction}
        submitLabel="저장하기"
        userId={user.id}
        products={products ?? []}
        initialContent={post.content}
        initialImageUrl={post.image_url ?? ""}
        initialScheduledAtLocal={toDatetimeLocalValue(post.scheduled_at)}
        initialPublishMode={post.status === "scheduled" ? "schedule" : "draft"}
        initialProductId={post.product_id ?? ""}
        hasThreadsAccount={Boolean(account)}
      />
    </div>
  );
}
