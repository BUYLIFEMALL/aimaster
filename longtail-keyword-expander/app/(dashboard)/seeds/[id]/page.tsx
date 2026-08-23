import { redirect } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

// 특정 실행 회차를 안 골랐을 때 들어오는 인덱스 페이지. 가장 최근 실행 결과로 바로 보내고,
// 실행 이력이 아예 없으면 왼쪽 사이드바(레이아웃)에서 "지금 확장하기"를 누르라는 안내만 보여준다.
export default async function SeedIndexPage({ params }: PageProps) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: latestRun } = await supabase
    .from("longtail_runs")
    .select("id")
    .eq("user_id", user.id)
    .eq("seed_id", params.id)
    .order("executed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRun) {
    redirect(`/seeds/${params.id}/runs/${latestRun.id}`);
  }

  return (
    <div className="text-center py-20 text-gray-400">
      <div className="text-5xl mb-4">🧩</div>
      <p>아직 실행 이력이 없습니다. 왼쪽의 "지금 다시 확장하기"를 눌러주세요.</p>
    </div>
  );
}
