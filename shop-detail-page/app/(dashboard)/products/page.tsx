import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";
import { CommerceUsageGuide } from "@/components/guide/CommerceUsageGuide";
import { imageSrc } from "@/lib/imageSrc";
import { LAYOUT_PRESETS, toLayoutPreset } from "@/lib/layoutPresets";
import { isInRetentionGrace, RETENTION_DAYS, RETENTION_GRACE_END_LABEL } from "@/lib/retention";

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
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-rose-50 text-rose-700 border-rose-200",
};

export default async function ProductsPage() {
  await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: products }, { data: program }] = await Promise.all([
    supabase
      .from("shop_products")
      .select("id, product_label, name, category, source_image_url, status, created_at, layout_preset")
      .order("created_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as unknown as { from: (table: string) => any })
      .from("programs")
      .select("description, short_desc")
      .eq("slug", "shop-detail-page")
      .maybeSingle() as Promise<{ data: { description: string | null; short_desc: string | null } | null }>,
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-10">
      {/* 상단 헤더 & 새 상품 등록 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🛍️</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              내 상품 상세페이지 관리
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
              15 · 12 · 9단 Studio
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            상품 사진 1장으로 Gemini AI가 15섹션·쿠팡 12단·스마트스토어 9단 상세페이지를 제작하고 롱 이미지로 병합합니다.
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-slate-400">
            🗓️ 상품·생성 이미지는 만든 날로부터 {RETENTION_DAYS}일 뒤 자동으로 삭제됩니다. 필요한 결과는 긴 이미지로 내려받아 보관해 주세요.
            {isInRetentionGrace() && ` (2026년 10월 21일 이전에 만든 자료는 ${RETENTION_GRACE_END_LABEL}부터 삭제됩니다.)`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/products/import"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-700 transition-all"
          >
            <span>📦</span>
            <span>12단 자료 가져오기</span>
          </Link>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-base leading-none">+</span>
            <span>새 상품 분석하기</span>
          </Link>
        </div>
      </div>

      {/* 프로그램 공식 소개 박스 */}
      {(program?.description || program?.short_desc) && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-2 font-bold text-xs text-blue-700">
            <span>ℹ️</span>
            <span>프로그램 소개 및 이용 안내</span>
          </div>
          {splitIntoSentenceParagraphs(program.description || program.short_desc || "").map((sentence, i) => (
            <p key={i} className="mb-1.5 text-xs sm:text-sm leading-relaxed text-slate-600 last:mb-0">
              {sentence}
            </p>
          ))}
        </div>
      )}

      {/* 비주얼 가이드북 (4단계 파이프라인 & 15단 블록 맵) */}
      <CommerceUsageGuide />

      {/* 등록 상품 목록 섹션 */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900">제작된 상품 목록</h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              총 {products?.length ?? 0}개
            </span>
          </div>
          <span className="text-xs text-slate-400">카드를 클릭하면 섹션 이미지를 확인·병합할 수 있습니다.</span>
        </div>

        {/* 비어있을 때 (Empty State) */}
        {(!products || products.length === 0) && (
          <div className="text-center py-16 px-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-blue-50 text-blue-600 text-3xl mb-4 shadow-xs">
              📦
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">아직 등록된 상세페이지가 없습니다</h3>
            <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
              판매할 상품의 대표 사진을 등록해보세요. Gemini AI가 상품을 분석해 15섹션·쿠팡 12단·스마트스토어 9단 중 고른 규격으로 상세페이지를 제작해 드립니다.
            </p>
            <Link
              href="/products/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm py-2.5 px-6 rounded-xl shadow-md shadow-blue-500/25 transition-all"
            >
              <span>+</span>
              <span>첫 상품 등록 및 분석 시작하기</span>
            </Link>
          </div>
        )}

        {/* 상품 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {(products ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="group bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="aspect-square bg-slate-50 relative overflow-hidden">
                {p.source_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc(p.source_image_url)}
                    alt={p.product_label ?? p.name ?? ""}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <span className="text-3xl mb-1">🖼️</span>
                    <span className="text-[11px]">사진 없음</span>
                  </div>
                )}
                {/* 우측 상단 카테고리 칩 */}
                {p.category && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                    {p.category}
                  </span>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      STATUS_BADGE_CLASSES[p.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {p.product_label || p.name || "(이름 없음)"}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{LAYOUT_PRESETS[toLayoutPreset(p.layout_preset)].label}</span>
                  <span className="text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform">
                    상세보기 →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
