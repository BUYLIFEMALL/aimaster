import { Workbench } from "@/components/kw/Workbench";
import { DashboardStats } from "@/components/kw/DashboardStats";
import { PageHero } from "@/components/ui/PageHero";
import { isUuid } from "@/lib/reports";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ report?: string }> }) {
  const { report } = await searchParams;
  return (
    <>
      <PageHero
        badge="🔍 STEP 1 · 키워드 분석"
        title="키워드 분석"
        description="자동완성·연관검색어·상위 블로그·경쟁력·오늘의 이슈·뉴스·트렌드를 한 화면에서 이어서 분석하고, 바로 쓸 글 제목과 공략법을 받아 보세요."
        tip="결과 안의 키워드를 누르면 같은 화면에서 바로 다시 분석됩니다. 모든 결과는 [분석 기록]에 자동 저장돼요."
      >
        <a className="button" href="/history">📁 분석 기록</a>
        <a className="button" href="/guide">📖 사용 매뉴얼</a>
      </PageHero>
      <DashboardStats />
      <Workbench initialReportId={isUuid(report) ? report : undefined} />
    </>
  );
}
