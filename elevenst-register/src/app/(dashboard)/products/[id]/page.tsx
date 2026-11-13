import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { getShopProduct, productName } from "@/lib/shop";
import { getSetupStatus } from "@/lib/setupStatus";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegisterForm } from "@/components/RegisterForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProductRegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireProgramAccess();
  // 마지막 11번가 등록 기록 — 이미 등록됐으면 화면을 열 때부터 알려 주고 보내기 단추를 잠근다(서버도 다시 막음)
  const lastJobQuery = createAdminClient()
    .from("elevenst_register_jobs")
    .select("status, elevenst_product_no, created_at")
    .eq("user_id", user.id)
    .eq("product_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const [shop, setup, lastJobRes] = await Promise.all([getShopProduct(user.id, id), getSetupStatus(user.id), lastJobQuery]);
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
        lastJob={
          lastJobRes.data
            ? { status: lastJobRes.data.status, productNo: lastJobRes.data.elevenst_product_no ? String(lastJobRes.data.elevenst_product_no) : "", createdAt: lastJobRes.data.created_at }
            : null
        }
      />
    </div>
  );
}
