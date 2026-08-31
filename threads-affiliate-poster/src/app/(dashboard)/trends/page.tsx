import { requireUser } from "@/lib/auth";
import { TrendExplorer } from "@/components/trends/TrendExplorer";
import { MarketResearch } from "@/components/trends/MarketResearch";

export default async function TrendsPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900">트렌드 키워드 찾기</h1>
        <p className="text-sm text-neutral-600">
          네이버 검색어트렌드로 카테고리별 관심도 변화를 확인하고, 요즘 뜨는 상품 키워드를
          먼저 찾아본 뒤 쿠팡·알리익스프레스에서 소싱해보세요. 숫자는 실제 검색량이 아니라
          선택한 기간 내 최고값을 100으로 놓은 상대 지표입니다.
        </p>
      </div>
      <TrendExplorer />
      <hr className="border-neutral-200" />
      <MarketResearch />
    </div>
  );
}
