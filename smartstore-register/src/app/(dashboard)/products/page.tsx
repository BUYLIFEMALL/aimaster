import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { listProducts } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { SHOP_DETAIL_SITE } from "@/lib/version";

export const dynamic = "force-dynamic";

const won = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("ko-KR")}원`);

export default async function ProductsPage() {
  const user = await requireProgramAccess();
  const { rows, error } = await listProducts(user.id);
  return (
    <div className="space-y-4">
      <PageHeader emoji="📦" title="등록할 상품" description="AI 상세페이지 자동화에서 만든 내 상품입니다. 고르면 스마트스토어 칸에 들어갈 값을 미리 확인합니다." />
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
            <Link href={`/products/${p.id}`} className="slw-card block p-4 transition hover:border-emerald-300">
              <p className="truncate font-extrabold text-slate-900">{p.name || p.product_label || "(상품명 없음)"}</p>
              <p className="mt-1 text-xs text-slate-600">
                정상가 {won(p.price)}{p.sale_price ? ` · 할인가 ${won(p.sale_price)}` : ""} · {p.category || "카테고리 미정"}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">상세페이지 수정 {new Date(p.updated_at).toLocaleDateString("ko-KR")}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
