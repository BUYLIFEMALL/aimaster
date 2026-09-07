import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ReportsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("kakao_reports")
    .select("id, topic_id, title, summary, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const topicIds = [...new Set((reports ?? []).map((r) => r.topic_id))];
  const { data: topics } =
    topicIds.length > 0
      ? await supabase.from("kakao_topics").select("id, topic_name").in("id", topicIds)
      : { data: [] as { id: string; topic_name: string }[] };
  const topicNameById = new Map((topics ?? []).map((t) => [t.id, t.topic_name]));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">리포트</h1>
      <p className="mb-6 text-sm text-neutral-600">
        등록한 주제에서 AI가 생성한 정보 콘텐츠 목록입니다.
      </p>

      <div className="space-y-3">
        {(reports ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            아직 생성된 리포트가 없습니다.{" "}
            <Link href="/topics" className="font-medium text-blue-600 hover:underline">
              주제 등록 페이지
            </Link>
            에서 &quot;지금 생성&quot;을 눌러보세요.
          </p>
        ) : (
          (reports ?? []).map((r) => (
            <Link
              key={r.id}
              href={`/reports/${r.id}`}
              className="block rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-900"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-neutral-900">{r.title}</p>
                <span className="shrink-0 text-xs text-neutral-400">
                  {new Date(r.created_at).toLocaleString("ko-KR")}
                </span>
              </div>
              {topicNameById.has(r.topic_id) && (
                <p className="mb-1 text-xs text-yellow-700">📌 {topicNameById.get(r.topic_id)}</p>
              )}
              <p className="whitespace-pre-line text-xs text-neutral-500">{r.summary}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
