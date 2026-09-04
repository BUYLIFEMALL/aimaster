import { createServiceClient } from "@/lib/supabase/service";
import GoldGradientText from "@/components/ui/GoldGradientText";
import LegalDocManager from "@/components/admin/LegalDocManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "약관/정책 관리" };

export default async function AdminLegalPage() {
  const supabase = createServiceClient();

  const { data: docs } = await supabase
    .from("legal_documents")
    .select("*")
    .order("slug", { ascending: true });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>약관 · 정책</GoldGradientText> 관리
        </h1>
        <p className="text-subtext mt-1">
          이용약관 · 개인정보처리방침 · 환불정책을 한 화면에서 관리하세요
        </p>
      </div>

      <LegalDocManager initialDocs={docs ?? []} />
    </div>
  );
}
