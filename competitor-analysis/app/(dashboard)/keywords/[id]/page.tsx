import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function KeywordDetailPage({ params }: PageProps) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: keyword } = await supabase
    .from("competitor_keywords")
    .select("id, keyword, location, google_domain, lang")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!keyword) notFound();

  const { data: jobs } = await supabase
    .from("competitor_serp_jobs")
    .select("id, total_results, executed_at")
    .eq("user_id", user.id)
    .eq("keyword_id", keyword.id)
    .order("executed_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/keywords" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        ← 키워드 목록으로
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">{keyword.keyword}</h1>
        <p className="text-xs text-gray-400 mt-1">
          {keyword.location} · {keyword.google_domain} · {keyword.lang}
        </p>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">📊</div>
          <p>아직 분석 이력이 없습니다. 키워드 목록에서 "지금 분석하기"를 눌러주세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/keywords/${keyword.id}/jobs/${job.id}`}
              className="block bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-blue-200 transition-colors"
            >
              <p className="font-bold text-gray-900">
                {new Date(job.executed_at).toLocaleString("ko-KR")}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                총 검색결과 {job.total_results?.toLocaleString() ?? "-"}건
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
