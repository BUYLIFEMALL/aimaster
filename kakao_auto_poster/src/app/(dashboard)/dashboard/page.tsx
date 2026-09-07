import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ count: topicCount }, { count: activeTopicCount }, { count: reportCount }] = await Promise.all([
    supabase.from("kakao_topics").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("kakao_topics")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase.from("kakao_reports").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">대시보드</h1>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-neutral-900">{topicCount ?? 0}</p>
          <p className="text-xs text-neutral-500">등록된 주제</p>
        </div>
        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{activeTopicCount ?? 0}</p>
          <p className="text-xs text-neutral-500">활성 주제</p>
        </div>
        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-neutral-900">{reportCount ?? 0}</p>
          <p className="text-xs text-neutral-500">생성된 리포트</p>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold text-neutral-900">시작하기</h2>
        <ol className="list-inside list-decimal space-y-1 text-sm text-neutral-600">
          <li>
            <Link href="/settings" className="font-medium text-blue-600 hover:underline">
              API 키 설정
            </Link>
            에서 본인 Perplexity/OpenAI 키를 등록합니다.
          </li>
          <li>
            <Link href="/topics" className="font-medium text-blue-600 hover:underline">
              관심 주제 등록
            </Link>
            에서 정보를 받아볼 주제와 키워드를 등록합니다.
          </li>
          <li>
            등록한 주제에서 &quot;지금 생성&quot;을 눌러 AI가 만든 정보 콘텐츠를{" "}
            <Link href="/reports" className="font-medium text-blue-600 hover:underline">
              리포트
            </Link>
            에서 확인합니다.
          </li>
        </ol>
      </div>
    </div>
  );
}
