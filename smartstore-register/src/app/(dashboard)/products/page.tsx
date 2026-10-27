import { requireProgramAccess } from "@/lib/access";
import { listProducts } from "@/lib/data";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { SHOP_DETAIL_SITE } from "@/lib/version";
import { BatchRegister } from "@/components/BatchRegister";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const user = await requireProgramAccess();
  const { rows, error } = await listProducts(user.id);
  return (
    <div className="space-y-4">
      <PageHeader emoji="📦" title="등록할 상품" description="AI 상세페이지 자동화에서 만든 내 상품입니다. 카드를 누르면 칸 값을 미리 보고 보내고, 왼쪽 상자로 여러 개를 고르면 아래에서 연속으로 보냅니다." />
      {error && <Notice tone="warn">⚠️ 상품을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요(상품이 없어진 것이 아닙니다).</Notice>}
      {!error && rows.length === 0 && (
        <Notice>
          불러올 상품이 없습니다.{" "}
          <a className="font-bold text-emerald-700 underline" href={`${SHOP_DETAIL_SITE}/products/new`} target="_blank" rel="noreferrer">AI 상세페이지 자동화에서 상품 만들기 ↗</a>
        </Notice>
      )}
      <BatchRegister rows={rows.map((p) => ({ id: p.id, title: p.name || p.product_label || "(상품명 없음)", price: p.price, salePrice: p.sale_price, category: p.category, reviewed: Boolean(p.reviewed_at), updated: new Date(p.updated_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) }))} />
    </div>
  );
}
