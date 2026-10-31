import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { getCoupangDefaults, getWingKeyStatus } from "@/lib/data";
import { getShopProduct, listShopProducts, productName } from "@/lib/shop";
import { nextProductId, registeredProductIds } from "@/lib/registered";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductForm } from "@/components/ProductForm";

export const dynamic = "force-dynamic";

export default async function ProductRegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireProgramAccess();
  const [shop, defaults, keys, list, registered] = await Promise.all([getShopProduct(user.id, id), getCoupangDefaults(user.id), getWingKeyStatus(user.id), listShopProducts(user.id), registeredProductIds(user.id)]);
  if (!shop) notFound();
  const p = shop.product;
  const sale = p.sale_price || p.price || 0;
  const original = Math.max(p.price || 0, sale);
  const thumbs = [shop.mainImage, ...shop.extraImages].filter((x): x is NonNullable<typeof x> => Boolean(x?.url)).slice(0, 6);

  return (
    <div className="space-y-5">
      <Link href="/products" className="text-xs font-bold text-blue-700">← 상품 목록</Link>
      <PageHeader emoji="📦" title={productName(p)} description={`이미지: 대표 ${shop.mainImage ? 1 : 0}장 · 추가 ${shop.extraImages.length}장 · 상세 섹션 ${shop.sectionImages.length}장`} />
      {thumbs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {thumbs.map((t) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={t.path} src={t.url!} alt="" className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-cover" />
          ))}
        </div>
      )}
      <ProductForm nextProductId={nextProductId(list.rows.map((r) => r.id), id, registered)} productId={id} initialName={productName(p)} originalPrice={original} salePrice={sale} shopCategory={p.category} keysSaved={keys.saved} defaultsSaved={Boolean(defaults)} />
    </div>
  );
}
