import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { listJobs, JOB_STATUS } from "@/lib/data";
import { cancelJobAction } from "@/lib/actions/register";
import { REGISTER_MODES, toRegisterMode } from "@/lib/smartstore/fields";
import { PageHeader, Notice } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireProgramAccess();
  const { rows, error } = await listJobs(user.id);
  return (
    <div className="space-y-4">
      <PageHeader emoji="🧾" title="등록 기록" description="확장이 보낸 결과입니다. 만든 날부터 30일 보관 후 자동으로 지워집니다." />
      {error && <Notice tone="warn">⚠️ 기록을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.</Notice>}
      {!error && rows.length === 0 && <Notice>아직 등록 작업이 없습니다. 「등록할 상품」에서 상품을 골라 확장으로 보내 보세요.</Notice>}
      <div className="slw-card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="bg-slate-50 text-[11px] text-slate-500">
            <tr><th className="px-3 py-2">만든 때</th><th className="px-3 py-2">방식</th><th className="px-3 py-2">카테고리</th><th className="px-3 py-2">상태</th><th className="px-3 py-2">결과</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((j) => (
              <tr key={j.id}>
                <td className="px-3 py-2 text-slate-600"><Link href={`/products/${j.product_id}`} className="hover:underline">{new Date(j.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</Link></td>
                <td className="px-3 py-2">{REGISTER_MODES[toRegisterMode(j.mode)].label}</td>
                <td className="px-3 py-2">{j.category_keyword}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${JOB_STATUS[j.status]?.tone ?? ""}`}>{JOB_STATUS[j.status]?.label ?? j.status}</span></td>
                <td className="px-3 py-2 text-slate-700">{j.market_product_no ? `상품번호 ${j.market_product_no}` : j.failed_step ? `멈춘 칸: ${j.failed_step}${j.error ? ` — ${j.error}` : ""}` : "—"}</td>
                <td className="px-3 py-2 text-right">
                  {(j.status === "queued" || j.status === "running") && (
                    <form action={cancelJobAction}>
                      <input type="hidden" name="jobId" value={j.id} />
                      <button type="submit" className="text-xs font-bold text-rose-700 hover:underline">취소</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
