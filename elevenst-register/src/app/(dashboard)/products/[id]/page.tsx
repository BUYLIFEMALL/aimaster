import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { getShopProduct, productName } from "@/lib/shop";
import { getSetupStatus } from "@/lib/setupStatus";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegisterForm } from "@/components/RegisterForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProductRegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireProgramAccess();
  const [shop, setup] = await Promise.all([getShopProduct(user.id, id), getSetupStatus(user.id)]);
  if (!shop) notFound();
  const p = shop.product;
  const thumbs = [shop.mainImage, ...shop.extraImages].filter((x): x is NonNullable<typeof x> => Boolean(x?.url)).slice(0, 6);

  return (
    <div className="space-y-5">
      <Link href="/products" className="text-xs font-bold text-indigo-700">
        ← 상품 목록
      </Link>
      <PageHeader emoji="📦" title={productName(p)} description={`이미지: 대표 ${shop.mainImage ? 1 : 0}장 · 추가 ${shop.extraImages.length}장(11번가는 3장까지) · 상세 섹션 ${shop.sectionImages.length}장`} />
      {thumbs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {thumbs.map((t) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={t.path} src={t.url!} alt="" className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-cover" />
          ))}
        </div>
      )}
      <RegisterForm
        productId={id}
        initialName={productName(p)}
        price={p.sale_price || p.price || 0}
        listPrice={p.price || 0}
        detailCategory={p.category ?? ""}
        specs={p.specs ?? ""}
        keySaved={Boolean(setup.elevenstKey)}
      />
    </div>
  );
}
