import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { CampaignCard, type CampaignCardData } from "@/components/campaigns/CampaignCard";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: campaigns } = await supabase
    .from("stepmail_campaigns")
    .select(
      "id, name, target_send_count, quantity_per_run, send_hour, recurrence, weekly_day, is_active, last_run_at, stepmail_email_drafts(subject)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const campaignList = (campaigns ?? []) as unknown as CampaignCardData[];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">예약 발송</h1>
        <Link
          href="/campaigns/new"
          className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          + 새 캠페인
        </Link>
      </div>

      {campaignList.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">📤</div>
          <p>아직 만든 캠페인이 없습니다. 이메일 초안을 먼저 작성한 뒤 캠페인을 만들어보세요!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaignList.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}
