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
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
  error: "bg-rose-50 text-rose-700 border-rose-200",
};

export default async function ProductsPage() {
  await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: products }, { data: program }] = await Promise.all([
    supabase
      .from("shop_products")
      .select("id, product_label, name, category, source_image_url, status, created_at, layout_preset, reviewed_at")
      .order("created_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as unknown as { from: (table: string) => any })
      .from("programs")
      .select("description, short_desc")
      .eq("slug", "shop-detail-page")
      .maybeSingle() as Promise<{ data: { description: string | null; short_desc: string | null } | null }>,
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6">
      
      {/* 1. 상단 GNB 헤더 & 새 상품 등록 CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-2xl">🛍️</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              내 상품 상세페이지 관리
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
              v1.35 HYPER STUDIO
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            상품 사진 1장으로 Gemini AI가 15섹션·쿠팡 12단·스마트스토어 9단 상세페이지를 제작하고 롱 이미지로 병합합니다.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            🗓️ 상품 및 생성 이미지는 생성일로부터 {RETENTION_DAYS}일 후 자동 정리되므로 완성본을 다운로드해 보관하세요.
            {isInRetentionGrace() && ` (이전 자료 유예: ${RETENTION_GRACE_END_LABEL}까지)`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/products/new"
            className="btn-3d-blue px-4 py-2.5 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 shadow-md"
          >
            <span className="text-sm font-black leading-none">+</span>
            <span>새 상세페이지 제작하기</span>
          </Link>
        </div>
      </div>

      {/* 2. 4단계 원스톱 워크플로우 인디케이터 배너 (시안 1 핵심 컴포넌트) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            원클릭 상세페이지 4단계 제작 파이프라인 (초보자 100% 자동 완성)
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">평균 제작 소요: 3분 이내</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold text-blue-700 uppercase">STEP 01</span>
              <span className="text-sm">📸</span>
            </div>
            <h3 className="text-xs font-bold text-slate-900">기본정보 & 원본 사진</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">제품명, 타겟, 정상가 등록</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase">STEP 02</span>
              <span className="text-sm">🧠</span>
            </div>
            <h3 className="text-xs font-bold text-slate-800">AI 소구점 분석</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">후킹 포인트 5종 자동 도출</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase">STEP 03</span>
              <span className="text-sm">🎨</span>
            </div>
            <h3 className="text-xs font-bold text-slate-800">15단/12단 섹션 생성</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">고화질 AI 이미지 & 카피</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase">STEP 04</span>
              <span className="text-sm">📦</span>
            </div>
            <h3 className="text-xs font-bold text-slate-800">롱이미지 병합 & 마켓 배포</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">쿠팡/스마트스토어 즉시 등록</p>
          </div>
        </div>
      </div>

      {/* 3. 등록 상품 목록 섹션 */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900">제작된 상품 상세페이지</h2>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full">
              총 {products?.length ?? 0}개
            </span>
          </div>
          <span className="text-xs text-slate-400">카드를 클릭하여 모바일 뷰파인더 검토 및 롱이미지를 병합하세요.</span>
        </div>

        {/* 비어있을 때 (Empty State) */}
        {(!products || products.length === 0) && (
          <div className="text-center py-16 px-4 bg-slate-50/50 border border-dashed border-slate-300 rounded-2xl">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-blue-100 text-blue-600 text-3xl mb-4">
              🛍️
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">아직 등록된 상세페이지가 없습니다</h3>
            <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
              판매할 상품의 대표 사진을 등록해보세요. Gemini AI가 상품을 분석해 15섹션·쿠팡 12단·스마트스토어 9단 규격으로 상세페이지를 자동 완성해 드립니다.
            </p>
            <Link
              href="/products/new"
              className="btn-3d-blue py-2.5 px-6 rounded-xl text-xs font-extrabold text-white inline-flex items-center gap-1.5"
            >
              <span>+</span>
              <span>첫 상품 등록 및 분석 시작하기</span>
            </Link>
          </div>
        )}

        {/* 상품 카드 그리드 (3열) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {(products ?? []).map((p) => {
            const presetInfo = LAYOUT_PRESETS[toLayoutPreset(p.layout_preset)];
            return (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {p.source_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageSrc(p.source_image_url)}
                        alt={p.product_label ?? p.name ?? ""}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                        <span className="text-3xl mb-1">🖼️</span>
                        <span className="text-[11px] font-medium">대표 이미지 없음</span>
                      </div>
                    )}
                    
                    {/* 상단 뱃지들 */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-xs ${
                          STATUS_BADGE_CLASSES[p.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                      {p.category && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                          {p.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {presetInfo.label}
                      </span>
                      <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors mt-2">
                      {p.product_label || p.name || "(이름 없음)"}
                    </h3>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between">
                  {p.reviewed_at ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✅ 검토완료
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">작업 진행 중</span>
                  )}
                  <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    에디터 열기 →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. 소개 및 매뉴얼 접이식 섹션 */}
      <details className="group" open={!products || products.length === 0}>
        <summary className="cursor-pointer select-none list-none rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>📖</span>
            <span>15단·12단·9단 상세페이지 제작 가이드 및 공식 소개 펼치기</span>
          </span>
          <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="mt-4 space-y-4">
          {(program?.description || program?.short_desc) && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2 font-black text-xs text-blue-800">
                <span>ℹ️</span>
                <span>프로그램 소개 및 공식 안내</span>
              </div>
              {splitIntoSentenceParagraphs(program.description || program.short_desc || "").map((sentence, i) => (
                <p key={i} className="mb-1 text-xs leading-relaxed text-slate-600 last:mb-0">
                  {sentence}
                </p>
              ))}
            </div>
          )}

          <CommerceUsageGuide />
        </div>
      </details>
    </div>
  );
}
