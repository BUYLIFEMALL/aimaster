import { createServiceClient } from "@/lib/supabase/service";
import GoldGradientText from "@/components/ui/GoldGradientText";
import FaqManager from "@/components/admin/FaqManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "FAQ 관리" };

export default async function AdminFaqPage() {
  const supabase = createServiceClient();

  const { data: faqs } = await supabase
    .from("faq_items")
    .select("*")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>FAQ</GoldGradientText> 관리
        </h1>
        <p className="text-subtext mt-1">
          /support/faq 페이지에 노출되는 자주 묻는 질문을 추가·수정·삭제하세요
        </p>
      </div>

      <FaqManager initialFaqs={faqs ?? []} />
    </div>
  );
}
