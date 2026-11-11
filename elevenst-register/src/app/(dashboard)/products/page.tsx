import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { listShopProducts, productName } from "@/lib/shop";
import { PageHeader, Notice } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProductsPage() {
  const user = await requireProgramAccess();
  const { rows, error } = await listShopProducts(user.id);

  return (
    <div className="space-y-5">
      <PageHeader emoji="📦" title="상품 등록" description="AI 상세페이지 자동화에서 만든 상품을 골라 11번가 등록 정보를 채우고 검사합니다." />
      <Notice tone="tip">💡 상세페이지에서 「검토 완료」한 상품이 위에 나옵니다. 상품을 누르면 카테고리 → 가격·옵션 → 배송 → 고시 → 검사 순서로 진행합니다. 지금 버전은 검사까지만 하고 11번가에 보내지 않습니다.</Notice>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">상품 목록을 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요.</p>}
      {!error && rows.length === 0 && (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          아직 상세페이지 상품이 없습니다.{" "}
          <a href="https://shop-detail-page.buylife.xyz/products/new" className="font-bold text-indigo-700 underline">
            AI 상세페이지 자동화에서 상품 만들기 →
          </a>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((p) => (
          <Link key={p.id} href={`/products/${p.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-indigo-300">
            <p className="font-bold text-slate-900">{productName(p)}</p>
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
