import { requireProgramAccess } from "@/lib/access";
import { TrendsContainer } from "@/components/trends/TrendsContainer";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function TrendsPage() {
  await requireProgramAccess();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900">트렌드 & 바이럴 떡상 탐지기</h1>
        <p className="text-sm text-neutral-600">
          Threads SNS에서 반응(좋아요·댓글·공유)이 폭발 중인 타인의 떡상 포스팅을 실시간 분석하고, AI 벤치마킹으로 내 상품 제휴 포스팅을 1초 만에 생성해보세요.
        </p>
      </div>

      <TrendsContainer />
    </div>
  );
}
