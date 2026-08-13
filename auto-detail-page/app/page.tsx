import ProductForm from "@/components/ProductForm";
import { AccountBar } from "@/components/AccountBar";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getRegisteredProviders } from "@/lib/apiKeys";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const registeredProviders = await getRegisteredProviders(supabase, user.id);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <AccountBar email={user.email ?? ""} />

        {/* 헤더 */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🛍️</div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            AI 상세페이지 자동생성기
          </h1>
          <p className="text-gray-500 text-base">
            제품 이미지와 정보를 입력하면<br />
            AI가 고객의 마음을 사로잡는 상세페이지를 만들어 드려요
          </p>
          <div className="flex justify-center gap-3 mt-4 text-sm flex-wrap">
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">✨ AI 카피라이팅</span>
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full">🎨 자동 디자인</span>
            <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full">📱 모바일 최적화</span>
          </div>
        </div>

        {/* 폼 */}
        <ProductForm registeredProviders={Array.from(registeredProviders)} />
      </div>
    </main>
  );
}
