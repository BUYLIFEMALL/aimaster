import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { ProductAnalyzeForm } from "@/components/products/ProductAnalyzeForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const registeredProviders = await getRegisteredProviders(supabase, user.id);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-10">
      {/* 상단 네비게이션 */}
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors mb-6"
      >
        <span>←</span>
        <span>상품 목록으로 돌아가기</span>
      </Link>

      {/* 헤더 안내 배너 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 text-3xl mb-3 shadow-xs">
          📸
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            상품 등록 및 소구점 AI 분석
          </h1>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            STEP 1
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          대표 사진을 업로드하면 Gemini AI가 특장점·타겟고객·스펙·감성톤을 정밀 분석하고, 고른 규격(15섹션·쿠팡 12단·스마트스토어 9단)에 맞춰 상세페이지를 기획합니다.
        </p>
      </div>

      <ProductAnalyzeForm hasGeminiKey={registeredProviders.has("gemini")} />
    </div>
  );
}
