import { requireUser } from "@/lib/auth";
import { PageHero } from "@/components/ui/PageHero";
import { ResultsClient } from "@/components/watch/ResultsClient";

export default async function ResultsPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-7xl">
      <PageHero
        badge="⭐ STEP 5 · 매물 결과"
        title="매물 결과와 후보"
        description="최근 수집한 매물을 실거래 시세와 비교합니다. 매매 매물의 평당 호가를 층과 면적이 비슷한 12개월 실거래 중간값과 견줍니다. 비슷한 거래가 5건 미만이면 비워 둡니다. 추정 수익률은 같은 화면의 월세 매물로 어림한 값입니다."
        tip="후보 점수는 시세 대비, 가격 내림 횟수, 등록 기간으로 매긴 참고값입니다. 위치와 건물 상태는 반영하지 않으며 투자 결과를 보증하지 않습니다."
      />
      <ResultsClient email={user.email ?? ""} />
    </div>
  );
}
