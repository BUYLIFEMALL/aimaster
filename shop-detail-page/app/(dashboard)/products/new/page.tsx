import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { ProductAnalyzeForm } from "@/components/products/ProductAnalyzeForm";

export const dynamic = "force-dynamic";

// v1.19: 상품소싱 자동화(trending-product-finder)의 「📄 상세페이지 만들기」가 상품 이름·원본 정보를 주소로 넘긴다.
// 도매가는 받지 않는다 — 할인가로 오해되면 혜택 문구가 생길 수 있어서다. 사진은 회원이 직접 올린다.
// 회원이 마진 계산기에서 고른 추천판매가(price)는 선택으로 받아 「정상가」 칸에만 넣는다 — 할인가가 비어 있으면 이미지에 가격·특가 문구가 들어가지 않는다.
function firstParam(value: string | string[] | undefined, max: number): string {
  const v = Array.isArray(value) ? value[0] : value;
  return (v ?? "").trim().slice(0, max);
}

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const registeredProviders = await getRegisteredProviders(supabase, user.id);
  const fromSourcing = firstParam(searchParams.from, 20) === "sourcing";
  const initialLabel = fromSourcing ? firstParam(searchParams.name, 100) : "";
  const initialSourceText = fromSourcing ? firstParam(searchParams.source, 1000) : "";
  const priceParam = fromSourcing ? firstParam(searchParams.price, 12) : "";
  const initialPrice = /^[1-9][0-9]{0,8}$/.test(priceParam) ? priceParam : "";

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

      {fromSourcing && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900 leading-relaxed">
          <p className="font-bold">🔎 상품소싱 자동화에서 가져온 상품입니다.</p>
          <p className="mt-0.5 text-emerald-800">
            상품명과 원본 정보를 채워 두었습니다
            {initialPrice ? `(추천판매가 ${Number(initialPrice).toLocaleString()}원은 「정상가」 칸에 넣었습니다)` : ""}. 대표 사진은 판매 권한이 있는 사진으로 직접 올려 주세요.
            할인가는 실제로 할인할 때만 입력하세요 — 비워 두면 이미지에 특가·할인 문구가 들어가지 않습니다.
          </p>
        </div>
      )}

      <ProductAnalyzeForm
        hasGeminiKey={registeredProviders.has("gemini")}
        initialLabel={initialLabel}
        initialSourceText={initialSourceText}
        initialPrice={initialPrice}
      />
    </div>
  );
}
