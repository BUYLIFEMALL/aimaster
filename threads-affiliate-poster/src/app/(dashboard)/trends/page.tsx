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
          키워드로 Threads 게시글을 검색하거나 직접 찾은 떡상글을 가져와 보관하고, 그 글의 문체를 참고한 AI 벤치마킹으로 내 상품 제휴 포스팅을 만들어보세요.
        </p>
      </div>

      <TrendsContainer />
    </div>
  );
}
