import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PromotionSendForm } from "@/components/promotions/PromotionSendForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function PromotionsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: submissions } = await supabase
    .from("crm_submissions")
    .select("id, name, phone")
    .eq("user_id", user.id)
    .not("phone", "is", null)
    .order("created_at", { ascending: false });

  const recipients = (submissions ?? [])
    .filter((s): s is { id: string; name: string | null; phone: string } => Boolean(s.phone))
    .map((s) => ({ id: s.id, name: s.name, phone: s.phone }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">📢 RCS 프로모션 발송</h1>
        <p className="text-sm text-gray-500">
          접수된 신청자 중 원하는 대상을 선택해서 RCS(3세대 문자)로 프로모션 메시지를 즉시
          발송합니다. 자동 규칙이 아니라 <b>1회성 발송</b>이며, 실제 발신 비용이 발생합니다.
          발송 전 <a href="/settings" className="font-semibold text-blue-600 hover:underline">설정</a>에서
          SOLAPI 계정과 RCS 브랜드 인증(brandId)을 먼저 등록해주세요.
        </p>
      </div>

      <PromotionSendForm recipients={recipients} />
    </div>
  );
}
