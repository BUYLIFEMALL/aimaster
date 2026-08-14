import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SectionImageGrid } from "@/components/products/SectionImageGrid";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "임시저장",
  analyzing: "분석중",
  analyzed: "분석완료",
  generating: "생성중",
  completed: "완료",
  error: "에러",
};

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("shop_products")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!product) {
    notFound();
  }

  const { data: templates } = await supabase
    .from("shop_prompt_templates")
    .select("id, section_key, section_name, section_order")
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .eq("is_active", true)
    .order("section_order", { ascending: true });

  const { data: images } = await supabase
    .from("shop_product_images")
    .select("section_key, image_url")
    .eq("product_id", product.id)
    .eq("language", product.language);

  const initialImages: Record<string, string> = {};
  for (const img of images ?? []) {
    if (img.image_url) initialImages[img.section_key] = img.image_url;
  }

  const hasAnyImage = Object.keys(initialImages).length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/products" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        ← 상품 목록으로
      </Link>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-6 flex gap-4">
        {product.source_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.source_image_url}
            alt={product.product_label ?? product.name ?? ""}
            className="w-24 h-24 object-cover rounded-xl shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-gray-900 truncate">
              {product.product_label || product.name || "(이름 없음)"}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
              {STATUS_LABELS[product.status] ?? product.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">{product.category}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">섹션별 상세페이지 이미지</h2>
          {hasAnyImage && (
            <a
              href={`/api/products/${product.id}/export`}
              className="text-sm font-semibold text-white bg-gray-900 hover:bg-black px-4 py-2 rounded-lg"
            >
              📥 병합 이미지 다운로드
            </a>
          )}
        </div>
        <SectionImageGrid
          productId={product.id}
          templates={templates ?? []}
          initialImages={initialImages}
        />
      </div>
    </div>
  );
}
