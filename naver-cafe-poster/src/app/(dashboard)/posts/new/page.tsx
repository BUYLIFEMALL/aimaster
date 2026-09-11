import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CafePostForm } from "@/components/posts/CafePostForm";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; content?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { title, content } = await searchParams;

  const [{ data: account }, { data: targets }] = await Promise.all([
    supabase.from("ncafe_accounts").select("id").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("ncafe_targets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">새 게시글 작성</h1>
      <CafePostForm
        targets={targets ?? []}
        hasNaverAccount={Boolean(account)}
        initialTitle={title ?? ""}
        initialContent={content ?? ""}
      />
    </div>
  );
}
