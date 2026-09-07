import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { TopicForm } from "@/components/topics/TopicForm";
import { TopicRow } from "@/components/topics/TopicRow";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function TopicsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: topics } = await supabase
    .from("kakao_topics")
    .select("id, topic_name, keywords, is_active")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">관심 주제 등록</h1>
      <p className="mb-6 text-sm text-neutral-600">
        정보를 받아볼 주제와 관련 키워드를 등록해두면, 이 주제로 최신 뉴스/정보/정책/트렌드
        콘텐츠를 AI가 만들어줍니다.
      </p>

      <div className="mb-6 rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-neutral-900">📌 새 주제 등록</h2>
        <TopicForm />
      </div>

      <div className="space-y-3">
        {(topics ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            아직 등록된 주제가 없습니다. 위에서 첫 주제를 등록해보세요.
          </p>
        ) : (
          (topics ?? []).map((t) => (
            <TopicRow key={t.id} id={t.id} topicName={t.topic_name} keywords={t.keywords} isActive={t.is_active} />
          ))
        )}
      </div>
    </div>
  );
}
