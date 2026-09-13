import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AIWriteForm } from "@/components/write/AIWriteForm";

export default async function WritePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: targets } = await supabase
    .from("ncafe_targets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">AI 글쓰기</h1>
        <p className="mt-1 text-sm text-neutral-600">
          주제와 세부 옵션을 지정하면 AI가 카페 게시글(과 대표 이미지)을 새로 만듭니다.
          생성이 끝나면 "AI 자동 초안생성" 화면으로 넘어가 검토·저장할 수 있습니다.
        </p>
      </div>

      <AIWriteForm targets={targets ?? []} />
    </div>
  );
}
