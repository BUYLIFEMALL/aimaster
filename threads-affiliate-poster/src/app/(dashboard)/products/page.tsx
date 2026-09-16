import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listUserDetailPages } from "@/lib/detailPages";
import { PlatformTabs } from "@/components/products/PlatformTabs";
import { ProductList } from "@/components/products/ProductList";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { keyword } = await searchParams;

  const [{ data: products }, detailPages] = await Promise.all([
    supabase
      .from("affiliate_products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    listUserDetailPages(supabase, user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900">상품 관리</h1>
        <p className="text-sm text-neutral-600">
          플랫폼을 고르고 상품을 등록하면, 게시글 작성 화면에서 이 상품을 골라 제휴 링크가 포함된
          캡션을 자동으로 만들 수 있습니다.
        </p>
      </div>

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-neutral-900">📖 상품 등록 &amp; 관리 사용방법</h2>
        <ol className="list-inside list-decimal space-y-2.5 text-sm text-neutral-700">
          <li>
            <span className="font-semibold text-neutral-900">쿠팡파트너스</span>: 검색어 키워드로 상품을 자동 검색하여 등록하거나, 쿠팡파트너스 사이트에서 발급받은 제휴 URL을 직접 입력해 등록합니다.
          </li>
          <li>
            <span className="font-semibold text-neutral-900">알리익스프레스</span>: 알리 상품 URL을 입력하면 본인의 Tracking ID가 적용된 제휴 링크로 자동 변환되어 등록됩니다.
          </li>
          <li>
            <span className="font-semibold text-neutral-900">네이버 &amp; 토스쇼핑</span>: 직접 발급받은 네이버 브랜드커넥트 딥링크를 입력하거나 토스 베스트/오늘의특가 상품 목록에서 선택하여 등록합니다.
          </li>
          <li>
            <span className="font-semibold text-neutral-900">AI 소구점 분석 (선택)</span>: 상품 이미지나 상세페이지를 업로드하면 AI가 핵심 셀링포인트를 분석해 글쓰기에 자동 반영합니다.
          </li>
          <li>
            <span className="font-semibold text-neutral-900">게시글 작성 활용</span>: 등록된 상품은 &quot;게시글 작성&quot; 화면에서 바로 선택하여 쓰레드 AI 홍보 캡션을 자동 생성할 수 있습니다.
          </li>
        </ol>
      </section>

      {/* 검색/등록 블록과 등록된 상품 목록 블록을 뚜렷한 박스(border-2 + shadow, 다른
          서브프로젝트 설정 페이지와 동일한 블록 구분 스타일)로 분리해 두 영역을 한눈에
          구분할 수 있게 한다(2026-09-12). */}
      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-neutral-900">🔎 상품 검색·등록</h2>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <PlatformTabs detailPages={detailPages} initialKeyword={keyword} />
        </div>
      </section>

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-neutral-900">📦 등록된 상품</h2>
        <div className="rounded-lg border border-neutral-200 bg-white">
          <ProductList products={products ?? []} />
        </div>
      </section>
    </div>
  );
}
