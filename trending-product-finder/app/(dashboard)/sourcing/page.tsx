import { requireProgramAccess } from "@/lib/access";
import { SourcingCalculator } from "@/components/sourcing/SourcingCalculator";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SourcingPage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string }>;
}) {
  await requireProgramAccess();
  const { keyword } = await searchParams;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <section>
        <h1 className="mb-2 text-2xl font-black text-gray-900">상품소싱 마진계산기</h1>
        <p className="text-sm text-gray-500">
          키워드로 알리익스프레스(해외)·도매매(국내) 소싱 후보를 검색하고, 관세·부가세·운송비·
          플랫폼 수수료까지 반영한 예상 마진을 바로 계산해볼 수 있습니다. 트렌드 리포트에서
          발굴한 키워드를 이 페이지로 가져와서 바로 원가를 확인해보세요.
        </p>
      </section>

      <SourcingCalculator initialKeyword={keyword} />
    </div>
  );
}
