import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { listShopProducts, productName } from "@/lib/shop";
import { registeredProductIds } from "@/lib/registered";
import { PageHeader, Notice } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const user = await requireProgramAccess();
  const [{ rows, error }, registered] = await Promise.all([listShopProducts(user.id), registeredProductIds(user.id)]);

  return (
    <div className="space-y-5">
      <PageHeader emoji="📦" title="상품 등록" description="AI 상세페이지 자동화에서 만든 상품을 골라 쿠팡 등록 정보를 채웁니다." />
      <Notice tone="tip">💡 상세페이지에서 「검토 완료」한 상품이 위에 나옵니다. 상품을 누르면 카테고리 추천 → 옵션 → 검사 순서로 진행합니다.</Notice>
      <Link href="/products/new" className="inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">➕ 상세페이지 없이 등록</Link>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">상품 목록을 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요.</p>}
      {!error && rows.length === 0 && (
        <p className="slw-card p-5 text-sm text-slate-600">
          아직 상세페이지 상품이 없습니다.{" "}
          <a href="https://shop-detail-page.buylife.xyz/products/new" className="font-bold text-blue-700 underline">AI 상세페이지 자동화에서 상품 만들기 →</a>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((p) => (
          <Link key={p.id} href={`/products/${p.id}`} className="slw-card block p-4 transition hover:border-blue-300">
            <p className="font-bold text-slate-900">{registered.has(p.id) && <span className="mr-1.5 rounded bg-teal-50 px-1.5 py-0.5 text-[11px] font-bold text-teal-800">쿠팡 등록함</span>}{productName(p)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {p.reviewed_at ? "✅ 검토 완료" : "검토 전"} · {p.sale_price ? `${p.sale_price.toLocaleString()}원` : p.price ? `${p.price.toLocaleString()}원` : "가격 없음"}
              {p.category ? ` · ${p.category}` : ""} · {new Date(p.updated_at).toLocaleDateString("ko-KR")}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
