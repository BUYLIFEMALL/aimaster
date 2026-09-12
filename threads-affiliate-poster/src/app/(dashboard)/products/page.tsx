import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listUserDetailPages } from "@/lib/detailPages";
import { PlatformTabs } from "@/components/products/PlatformTabs";
import { ProductList } from "@/components/products/ProductList";

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
