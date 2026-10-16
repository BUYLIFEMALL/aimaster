import { requireProgramAccess } from "@/lib/access";
import { PageHero } from "@/components/layout/PageHero";
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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHero
        badge="📢 RCS 프로모션"
        title="RCS 프로모션 발송"
        description="접수된 신청자 중 원하는 대상을 골라 RCS(3세대 문자)로 프로모션 메시지를 즉시 보냅니다. 자동 규칙이 아니라 1회성 발송이에요."
        tip="실제 발신 비용이 회원님 SOLAPI 계정에서 나갑니다. 설정에서 SOLAPI 계정과 RCS 브랜드 인증(brandId)을 먼저 등록하세요."
      />

      <PromotionSendForm recipients={recipients} />
    </div>
  );
}
