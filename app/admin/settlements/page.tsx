import { createClient } from "@/lib/supabase/server";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import SettlementActions from "@/components/admin/SettlementActions";
import { formatKRW, formatDate } from "@/lib/utils/format";

export const metadata = { title: "정산 관리" };

export default async function AdminSettlementsPage() {
  const supabase = await createClient();
  const { data: settlements } = await supabase
    .from("settlement_requests")
    .select("*, user:profiles(name, email)")
    .order("requested_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>정산</GoldGradientText> 관리
        </h1>
        <p className="text-subtext mt-1">어필리에이트 정산 요청을 처리하세요</p>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        {!settlements || settlements.length === 0 ? (
          <p className="text-subtext text-center py-12">정산 요청이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs text-subtext font-medium p-4">회원</th>
                <th className="text-right text-xs text-subtext font-medium p-4">금액</th>
                <th className="text-left text-xs text-subtext font-medium p-4 hidden md:table-cell">계좌 정보</th>
                <th className="text-center text-xs text-subtext font-medium p-4 hidden sm:table-cell">상태</th>
                <th className="text-right text-xs text-subtext font-medium p-4">관리</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id} className="border-b border-white/5">
                  <td className="p-4">
                    <p className="text-white text-sm">{(s.user as { name?: string; email: string })?.name ?? "-"}</p>
                    <p className="text-subtext text-xs">{formatDate(s.requested_at)}</p>
                  </td>
                  <td className="p-4 text-right">
                    <span className="gold-text font-bold">{formatKRW(s.amount)}</span>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <p className="text-sm text-white">{s.bank_name} {s.account_number}</p>
                    <p className="text-xs text-subtext">{s.account_holder}</p>
                  </td>
                  <td className="p-4 text-center hidden sm:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.status === "approved"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : s.status === "rejected"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-gold/20 text-gold"
                    }`}>
                      {s.status === "approved" ? "승인" : s.status === "rejected" ? "반려" : "대기"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {s.status === "pending" && (
                      <SettlementActions settlementId={s.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
