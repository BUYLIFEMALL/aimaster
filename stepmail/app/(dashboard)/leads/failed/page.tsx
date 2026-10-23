import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FAILED_LOG_LIMIT = 200;

export default async function FailedSendsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("stepmail_send_log")
    .select("id, lead_id, campaign_id, subject, error_message, sent_at")
    .eq("user_id", user.id)
    .eq("status", "failed")
    .order("sent_at", { ascending: false })
    .limit(FAILED_LOG_LIMIT);

  const failedLogs = logs ?? [];

  // Relationships 메타데이터가 없어 임베디드 조인 대신 두 단계 쿼리로 이메일/캠페인명을 붙인다.
  const leadIds = Array.from(new Set(failedLogs.map((l) => l.lead_id)));
  const campaignIds = Array.from(new Set(failedLogs.map((l) => l.campaign_id).filter((id): id is string => Boolean(id))));

  const [{ data: leadRows }, { data: campaignRows }] = await Promise.all([
    leadIds.length > 0
      ? supabase.from("stepmail_leads").select("id, email").in("id", leadIds)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
    campaignIds.length > 0
      ? supabase.from("stepmail_campaigns").select("id, name").in("id", campaignIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const emailByLeadId = new Map((leadRows ?? []).map((l) => [l.id, l.email]));
  const nameByCampaignId = new Map((campaignRows ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div>
        <Link href="/leads" className="text-xs font-semibold text-gray-500 hover:underline">
          ← 잠재고객 DB관리로 돌아가기
        </Link>
        <h1 className="text-2xl font-black text-gray-900 mt-2 mb-2">⚠️ 발송 실패 내역</h1>
        <p className="text-sm text-gray-500">
          최근 발송 실패 기록입니다(최대 {FAILED_LOG_LIMIT}건). 이메일 계정 설정이나 상대 메일함
          상태를 확인한 뒤, 다시 보내려면 해당 리드가 포함된 캠페인을 재실행하세요.
        </p>
      </div>

      {failedLogs.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <p className="p-8 text-center text-sm text-gray-400">발송 실패 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="py-2 px-3 text-xs font-semibold text-gray-500">이메일</th>
                <th className="py-2 px-3 text-xs font-semibold text-gray-500">캠페인</th>
                <th className="py-2 px-3 text-xs font-semibold text-gray-500">에러 메시지</th>
                <th className="py-2 px-3 text-xs font-semibold text-gray-500">실패 시각</th>
              </tr>
            </thead>
            <tbody>
              {failedLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 px-3 text-sm text-gray-900">{emailByLeadId.get(log.lead_id) ?? "(삭제된 리드)"}</td>
                  <td className="py-2 px-3 text-sm text-gray-500">
                    {log.campaign_id ? nameByCampaignId.get(log.campaign_id) ?? "(삭제된 캠페인)" : "-"}
                  </td>
                  <td className="py-2 px-3 text-xs text-red-600">{log.error_message ?? "-"}</td>
                  <td className="py-2 px-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.sent_at).toLocaleString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
