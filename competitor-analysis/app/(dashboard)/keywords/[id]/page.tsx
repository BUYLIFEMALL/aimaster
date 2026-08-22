import { redirect } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

// 특정 회차를 안 골랐을 때 들어오는 인덱스 페이지. 가장 최근 분석 결과로 바로 보내고,
// 분석 이력이 아예 없으면 왼쪽 사이드바(레이아웃)에서 "지금 분석하기"를 누르라는 안내만 보여준다.
export default async function KeywordIndexPage({ params }: PageProps) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: latestJob } = await supabase
    .from("competitor_serp_jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("keyword_id", params.id)
    .order("executed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestJob) {
    redirect(`/keywords/${params.id}/jobs/${latestJob.id}`);
  }

  return (
    <div className="text-center py-20 text-gray-400">
      <div className="text-5xl mb-4">📊</div>
      <p>아직 분석 이력이 없습니다. 왼쪽의 "지금 다시 분석하기"를 눌러주세요.</p>
    </div>
  );
}
