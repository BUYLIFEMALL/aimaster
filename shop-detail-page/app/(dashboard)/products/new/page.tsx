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
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
          <div className="text-5xl mb-4">🖼️</div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">상품 및 상세페이지 분석</h1>
          <p className="text-gray-500 text-base">
            상품 이미지를 올리면 AI가 분석해서 상세페이지에 필요한 정보를 채워드려요
          </p>
        </div>
      <ProductAnalyzeForm hasGeminiKey={registeredProviders.has("gemini")} />
    </div>
  );
}
