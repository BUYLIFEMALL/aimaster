import { HistoryList } from "@/components/kw/HistoryList";
import { PageHero } from "@/components/ui/PageHero";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function HistoryPage() {
  return (
    <>
      <PageHero
        badge="📁 STEP 2 · 분석 기록"
        title="분석 기록"
        description="분석한 결과는 자동으로 저장됩니다. 기록을 누르면 같은 화면에서 다시 열고, 즐겨찾기로 보관할 수 있습니다."
        tip="키워드 검색과 분석 종류 칩으로 원하는 기록만 빠르게 찾을 수 있어요."
      >
        <a className="button primary" href="/dashboard">🔍 새 키워드 분석</a>
      </PageHero>
      <HistoryList />
    </>
  );
}
