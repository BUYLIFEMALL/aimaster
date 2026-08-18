import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { CampaignForm } from "@/components/campaigns/CampaignForm";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage({ searchParams }: { searchParams: { draftId?: string } }) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: drafts }, { data: smtpAccounts }] = await Promise.all([
    supabase.from("stepmail_email_drafts").select("id, subject").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase
      .from("user_smtp_accounts")
      .select("id, label, is_active")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">📤</div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">예약 발송 캠페인 만들기</h1>
        <p className="text-gray-500 text-base">원하는 수량, 시간대, 반복주기로 자동 발송을 예약합니다</p>
      </div>
      <CampaignForm drafts={drafts ?? []} smtpAccounts={smtpAccounts ?? []} defaultDraftId={searchParams.draftId} />
    </div>
  );
}
