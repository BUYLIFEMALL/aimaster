import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SectionImageGrid } from "@/components/products/SectionImageGrid";
import type { ImageModelKey } from "@/lib/ai/imageModels";
import { imageSrc } from "@/lib/imageSrc";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "임시저장",
  analyzing: "AI 분석중",
  analyzed: "소구점 분석완료",
  generating: "15단 생성중",
  completed: "상세페이지 완성",
  error: "오류",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  analyzing: "bg-blue-50 text-blue-700 border-blue-200",
  analyzed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  generating: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-rose-50 text-rose-700 border-rose-200",
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
    .select("section_key, image_url, image_urls")
    .eq("product_id", product.id)
    .eq("language", product.language);

  const initialImages: Record<string, { url: string; history: string[] }> = {};
  for (const img of images ?? []) {
    if (img.image_url) {
      initialImages[img.section_key] = { url: img.image_url, history: img.image_urls ?? [] };
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-10">
      {/* 상단 네비게이션 */}
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors mb-5"
      >
        <span>←</span>
        <span>상품 목록으로 돌아가기</span>
      </Link>

      {/* 상품 요약 헤더 카드 */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs mb-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
        {product.source_image_url && (
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-2xs bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc(product.source_image_url)}
              alt={product.product_label ?? product.name ?? ""}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate tracking-tight">
              {product.product_label || product.name || "(이름 없음)"}
            </h1>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                STATUS_BADGE_CLASSES[product.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {STATUS_LABELS[product.status] ?? product.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {product.category && (
              <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                카테고리: {product.category}
              </span>
            )}
            <span>등록일: {new Date(product.created_at).toLocaleDateString()}</span>
            <span>언어: {product.language?.toUpperCase() ?? "KO"}</span>
          </div>
        </div>
      </div>

      {/* 15단 섹션 생성 및 관리 컨테이너 */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🎨</span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">15단 상세페이지 섹션 스튜디오</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                15 SECTIONS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              헤더부터 최종 CTA까지 15개 섹션을 생성하고, 마음에 들지 않는 섹션은 개별 재생성하거나 직접 업로드할 수 있습니다.
            </p>
          </div>
        </div>

        <SectionImageGrid
          productId={product.id}
          language={product.language}
          templates={templates ?? []}
          initialImages={initialImages}
          initialModel={product.default_image_model as ImageModelKey}
        />
      </div>
    </div>
  );
}
