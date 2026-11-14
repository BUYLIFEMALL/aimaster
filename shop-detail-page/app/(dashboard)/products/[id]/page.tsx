import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SectionImageGrid } from "@/components/products/SectionImageGrid";
import { threadsDraftText } from "@/lib/threadsLink";
import { HtmlExportPanel } from "@/components/products/HtmlExportPanel";
import { ShippingNoticeCard } from "@/components/products/ShippingNoticeCard";
import { CopyTonePanel } from "@/components/products/CopyTonePanel";
import type { ImageModelKey } from "@/lib/ai/imageModels";
import { imageSrc } from "@/lib/imageSrc";
import { LAYOUT_PRESETS, toLayoutPreset } from "@/lib/layoutPresets";
import { applySectionSequence } from "@/lib/sectionOrder";
import { MarketRegisterPanel } from "@/components/products/MarketRegisterPanel";
import { ShortsHandoffCard } from "@/components/products/ShortsHandoffCard";
import { MARKETS, pickCoupangResult, pickElevenstResult, pickMarketResult, type MarketResult } from "@/lib/markets";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "임시저장",
  analyzing: "AI 분석중",
  analyzed: "소구점 분석완료",
  generating: "섹션 생성중",
  completed: "상세페이지 완성",
  error: "오류",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  analyzing: "bg-blue-50 text-blue-700 border-blue-200",
  analyzed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  generating: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
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
    .eq("layout_preset", product.layout_preset ?? "shop15")
    .order("section_order", { ascending: true });

  const { data: images } = await supabase
    .from("shop_product_images")
    .select("section_key, image_url, image_urls")
    .eq("product_id", product.id)
    .eq("language", product.language);

  // 마켓 등록 결과(회원 본인 작업 기록만, RLS)
  const marketResults: MarketResult[] = [];
  for (const market of MARKETS) {
    if (market.jobsTable === "coupang_ops_jobs") {
      const { data: coupangJobs } = await (supabase.from("coupang_ops_jobs" as never) as unknown as { select: (c: string) => { eq: (k: string, v: string) => { in: (k: string, v: string[]) => { order: (k: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: { status: string; seller_product_id: number | null; updated_at: string }[] | null }> } } } } })
        .select("status, seller_product_id, updated_at")
        .eq("product_id", product.id)
        .in("status", ["saved", "requested", "approved", "rejected"])
        .order("updated_at", { ascending: false })
        .limit(1);
      const coupang = pickCoupangResult(coupangJobs ?? []);
      if (coupang) marketResults.push(coupang);
      continue;
    }
    if (market.jobsTable === "elevenst_register_jobs") {
      const { data: elevenstJobs } = await (supabase.from("elevenst_register_jobs" as never) as unknown as { select: (c: string) => { eq: (k: string, v: string) => { in: (k: string, v: string[]) => { order: (k: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: { status: string; elevenst_product_no: number | null; updated_at: string }[] | null }> } } } } })
        .select("status, elevenst_product_no, updated_at")
        .eq("product_id", product.id)
        .in("status", ["registered", "stopped"])
        .order("updated_at", { ascending: false })
        .limit(10);
      const elevenst = pickElevenstResult(elevenstJobs ?? []);
      if (elevenst) marketResults.push(elevenst);
      continue;
    }
    const { data: jobs } = await supabase
      .from(market.jobsTable)
      .select("status, market_product_no, updated_at")
      .eq("product_id", product.id)
      .in("status", ["registered", "temp_saved"])
      .order("updated_at", { ascending: false })
      .limit(10);
    const picked = pickMarketResult(market.id, jobs ?? []);
    if (picked) marketResults.push(picked);
  }

  const preset = LAYOUT_PRESETS[toLayoutPreset(product.layout_preset)];

  const initialImages: Record<string, { url: string; history: string[] }> = {};
  for (const img of images ?? []) {
    if (img.image_url) {
      initialImages[img.section_key] = { url: img.image_url, history: img.image_urls ?? [] };
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6">
      
      {/* 1. 상단 내비게이션 & 파이프라인 인디케이터 배너 */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1"
          >
            <span>←</span>
            <span>목록으로</span>
          </Link>
          <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900 truncate max-w-xs sm:max-w-md">
                {product.product_label || product.name || "(이름 없음)"}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  STATUS_BADGE_CLASSES[product.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {STATUS_LABELS[product.status] ?? product.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              규격: <span className="font-bold text-blue-700">{preset.label}</span> · 총 {(templates ?? []).length}섹션
            </p>
          </div>
        </div>

        {/* 4단계 워크플로우 인디케이터 뱃지 */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="text-slate-500">1.기본정보</span>
          <span>›</span>
          <span className="text-slate-500">2.소구점</span>
          <span>›</span>
          <span className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md font-extrabold animate-pulse">
            3.섹션 생성 & 편집
          </span>
          <span>›</span>
          <span className="text-slate-500">4.롱이미지 병합</span>
        </div>
      </div>

      {/* 2. 상품 요약 카드 */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          {product.source_image_url ? (
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-xs bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc(product.source_image_url)}
                alt={product.product_label ?? product.name ?? ""}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
              <span className="text-2xl">🛍️</span>
              <span className="text-[9px]">사진 없음</span>
            </div>
          )}

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 truncate tracking-tight">
              {product.product_label || product.name || "(이름 없음)"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
              {product.category && (
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  카테고리: {product.category}
                </span>
              )}
              <span>등록일: {new Date(product.created_at).toLocaleDateString()}</span>
              <span>언어: {product.language?.toUpperCase() ?? "KO"}</span>
              {product.reviewed_at && (
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                  ✅ 검토 완료
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 상단 롱이미지 병합 바로가기 안내 */}
        <div className="w-full sm:w-auto flex flex-col sm:items-end gap-1.5 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
          <span className="text-[11px] font-bold text-slate-500">
            15섹션 완성을 위해 아래에서 이미지를 생성하세요.
          </span>
          <span className="text-[10px] text-slate-400">
            섹션 완성이 끝나면 하단에서 원클릭으로 롱이미지가 병합됩니다.
          </span>
        </div>
      </div>

      {/* 3. 15단 섹션 스튜디오 에디터 컨테이너 */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎨</span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">{preset.label} 섹션 스튜디오</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                {(templates ?? []).length} SECTIONS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {preset.description}. 마음에 들지 않는 섹션은 개별 재생성하거나 직접 이미지를 업로드할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 메인 섹션 그리드 */}
        <SectionImageGrid
          productId={product.id}
          language={product.language}
          templates={applySectionSequence(templates ?? [], product.section_sequence)}
          hasCustomOrder={Boolean(product.section_sequence?.length)}
          initialImages={initialImages}
          initialModel={product.default_image_model as ImageModelKey}
          threadsDraft={threadsDraftText(product)}
        />
        
        {/* 배송 안내 카드 */}
        <ShippingNoticeCard />
        
        {/* HTML 복사 및 다운로드 패널 */}
        <HtmlExportPanel productId={product.id} />
        
        {/* 카피라이팅 톤앤매너 패널 */}
        <CopyTonePanel productId={product.id} />
        
        {/* 오픈마켓 연계 등록 패널 */}
        <MarketRegisterPanel
          productId={product.id}
          initialReviewedAt={product.reviewed_at}
          results={marketResults}
        />

        {/* 상품 → AI 쇼츠 원스톱 넘기기 */}
        <ShortsHandoffCard product={product} />
      </div>

    </div>
  );
}
