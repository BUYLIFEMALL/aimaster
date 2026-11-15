import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { listProducts } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { SHOP_DETAIL_SITE } from "@/lib/version";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const user = await requireProgramAccess();
  const { rows, error } = await listProducts(user.id);
  return (
    <div className="space-y-4">
      <PageHeader emoji="📦" title="등록할 상품" description="AI 상세페이지 자동화에서 만든 내 상품입니다. 카드를 누르면 ESM+ 칸에 넣을 값을 미리 보고 보낼 수 있습니다." />
      {error && <Notice tone="warn">⚠️ 상품을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요(상품이 없어진 것이 아닙니다).</Notice>}
      {!error && rows.length === 0 && (
        <Notice>
          불러올 상품이 없습니다.{" "}
          <a className="font-bold text-emerald-700 underline" href={`${SHOP_DETAIL_SITE}/products/new`} target="_blank" rel="noreferrer">AI 상세페이지 자동화에서 상품 만들기 ↗</a>
        </Notice>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {rows.map((p) => (
          <li key={p.id}>
            <Link href={`/products/${p.id}`} className="slw-card block p-4 hover:ring-1 hover:ring-emerald-600">
              <div className="flex items-start justify-between gap-2">
                <b className="line-clamp-2 text-sm text-slate-900">{p.name || p.product_label || "(상품명 없음)"}</b>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${p.reviewed_at ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{p.reviewed_at ? "✅ 검토 완료" : "검토 전"}</span>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">{p.category || "카테고리 없음"}</p>
              <p className="mt-1 text-xs text-slate-700">
                {p.sale_price ? `${p.sale_price.toLocaleString("ko-KR")}원` : p.price ? `${p.price.toLocaleString("ko-KR")}원` : "가격 없음"} · {new Date(p.updated_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
