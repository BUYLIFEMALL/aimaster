import { createServiceClient } from "@/lib/supabase/service";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GuideManager from "@/components/admin/GuideManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "API/플랫폼 가이드 관리" };

export default async function AdminGuidesPage() {
  const supabase = createServiceClient();

  const [{ data: guides }, { data: categories }] = await Promise.all([
    supabase
      .from("platform_guides")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("platform_guide_categories")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>API 생성 · 플랫폼 연동</GoldGradientText> 가이드 관리
        </h1>
        <p className="text-subtext mt-1">
          /guides 페이지에 노출되는 플랫폼별 API 키 발급/연동 방법 가이드를 카테고리별로 추가·수정·삭제하세요
        </p>
      </div>

      <GuideManager initialGuides={guides ?? []} initialCategories={categories ?? []} />
    </div>
  );
}
