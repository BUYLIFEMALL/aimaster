import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DraftComposerSection } from "@/components/posts/DraftComposerSection";
import { DraftList } from "@/components/posts/DraftList";

export default async function DraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; content?: string; edit?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { title, content, edit } = await searchParams;

  const [{ data: account }, { data: targets }, { data: drafts }] = await Promise.all([
    supabase.from("ncafe_accounts").select("id").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("ncafe_targets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("ncafe_posts")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["draft", "failed"])
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">AI 글쓰기</h1>
        <p className="mt-1 text-sm text-neutral-600">
          자동 생성 → 수정 → 검수 → 배포 순서로 진행합니다. 저장한 초안은 실제 카페에
          게시되지 않으며, 아래 목록에서 검토를 마친 뒤 "배포" 버튼을 눌러야 게시됩니다.
        </p>
      </div>

      {/* ?edit=<id>로 "기존 초안 하나만 고치러" 들어온 경우엔 이 새 글 생성 폼이 작업과
          무관하니 기본으로 접어둔다 — 단, 글감 수집에서 title/content를 들고 넘어온 경우는
          그 자체가 "이 내용으로 새 글을 만드는" 흐름이라 접지 않는다(2026-09-12). */}
      <DraftComposerSection
        targets={targets ?? []}
        initialTitle={title ?? ""}
        initialContent={content ?? ""}
        defaultCollapsed={Boolean(edit) && !title && !content}
      />

      <div>
        <h2 className="mb-3 text-lg font-medium text-neutral-900">
          검수 대기 중인 초안 ({(drafts ?? []).length})
        </h2>
        <DraftList
          drafts={drafts ?? []}
          targets={targets ?? []}
          hasNaverAccount={Boolean(account)}
          editId={edit}
        />
      </div>
    </div>
  );
}
