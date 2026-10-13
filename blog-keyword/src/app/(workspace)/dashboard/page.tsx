import { Workbench } from "@/components/kw/Workbench";
import { isUuid } from "@/lib/reports";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ report?: string }> }) {
  const { report } = await searchParams;
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">블로그 키워드</p>
        <h1>키워드 분석</h1>
        <p>자동완성·연관검색어·상위 블로그·경쟁력·오늘의 이슈·뉴스·트렌드를 한 화면에서 이어서 분석하고, 바로 쓸 글 제목과 공략법을 받아 보세요.</p>
      </div>
      <Workbench initialReportId={isUuid(report) ? report : undefined} />
    </>
  );
}
