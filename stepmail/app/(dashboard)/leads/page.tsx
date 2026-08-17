import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { LeadImportForm } from "@/components/leads/LeadImportForm";
import { LeadsTable } from "@/components/leads/LeadsTable";
import type { LeadRowData } from "@/components/leads/LeadRow";
import { PageSizeSelect } from "@/components/leads/PageSizeSelect";
import { PAGE_SIZE_OPTIONS } from "@/lib/leadsPaging";
import { STATUS_LABEL } from "@/lib/leadStatus";

export const dynamic = "force-dynamic";
// 엑셀 가져오기가 수천~수만 행일 수 있어(잠재고객(T).xlsx 실측 9,999건) 기본 함수 제한 시간보다
// 넉넉하게 잡아둔다.
export const maxDuration = 120;

const DEFAULT_LEADS_PER_PAGE = 50;

// 발송 "차수"(1~5차)는 send_count로 표현한다. 필터를 미발송/발송됨 두 버킷으로 뭉치지 않고
// 1~5차를 각각 별도 칩으로 나눠서 단계별로 조회·관리할 수 있게 한다.
const STATUS_FILTERS = [
  { key: "all", label: "전체" },
  { key: "unsent", label: "미발송" },
  { key: "sent_1", label: "1차 발송" },
  { key: "sent_2", label: "2차 발송" },
  { key: "sent_3", label: "3차 발송" },
  { key: "sent_4", label: "4차 발송" },
  { key: "sent_5", label: "5차 발송" },
  { key: "customer_completed", label: STATUS_LABEL.customer_completed.label },
  { key: "stopped", label: STATUS_LABEL.stopped.label },
] as const;
type StatusFilterKey = (typeof STATUS_FILTERS)[number]["key"];
const SEND_COUNT_FILTER_KEYS = ["sent_1", "sent_2", "sent_3", "sent_4", "sent_5"] as const;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string; limit?: string };
}) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const leadsPerPage = PAGE_SIZE_OPTIONS.includes(Number(searchParams.limit) as (typeof PAGE_SIZE_OPTIONS)[number])
    ? Number(searchParams.limit)
    : DEFAULT_LEADS_PER_PAGE;
  const currentPage = Math.max(1, Number(searchParams.page) || 1);
  const statusFilter = (STATUS_FILTERS.some((f) => f.key === searchParams.status) ? searchParams.status : "all") as StatusFilterKey;
  const from = (currentPage - 1) * leadsPerPage;
  const to = from + leadsPerPage - 1;

  let countQuery = supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  let listQuery = supabase
    .from("stepmail_leads")
    .select("id, input_date, channel, nickname, email, status, send_count, last_sent_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  const sentStepIndex = SEND_COUNT_FILTER_KEYS.indexOf(statusFilter as (typeof SEND_COUNT_FILTER_KEYS)[number]);

  if (statusFilter === "unsent") {
    countQuery = countQuery.eq("status", "new").eq("send_count", 0);
    listQuery = listQuery.eq("status", "new").eq("send_count", 0);
  } else if (sentStepIndex !== -1) {
    const step = sentStepIndex + 1; // sent_1 -> 1, sent_2 -> 2, ...
    countQuery = countQuery.eq("status", "new").eq("send_count", step);
    listQuery = listQuery.eq("status", "new").eq("send_count", step);
  } else if (statusFilter === "customer_completed" || statusFilter === "stopped") {
    countQuery = countQuery.eq("status", statusFilter);
    listQuery = listQuery.eq("status", statusFilter);
  }

  const [{ count: totalCount }, { data: leads }] = await Promise.all([countQuery, listQuery]);
  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / leadsPerPage));
  const leadList = (leads ?? []) as LeadRowData[];

  // 필터 칩별 전체 개수 요약(현재 페이지 필터와 무관하게 항상 전체 기준). Supabase가 select
  // 응답을 기본 1000행으로 잘라내기 때문에(9,999건 실측 리드에서 재현됨), count:"exact",
  // head:true 쿼리를 칩마다 각각 날려서 정확한 건수를 구한다.
  const [unsentRes, sent1Res, sent2Res, sent3Res, sent4Res, sent5Res, completedRes, stoppedRes, failedLogRes] = await Promise.all([
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "new").eq("send_count", 0),
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "new").eq("send_count", 1),
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "new").eq("send_count", 2),
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "new").eq("send_count", 3),
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "new").eq("send_count", 4),
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "new").eq("send_count", 5),
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "customer_completed"),
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "stopped"),
    supabase.from("stepmail_send_log").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "failed"),
  ]);
  const unsentCount = unsentRes.count ?? 0;
  const sent1Count = sent1Res.count ?? 0;
  const sent2Count = sent2Res.count ?? 0;
  const sent3Count = sent3Res.count ?? 0;
  const sent4Count = sent4Res.count ?? 0;
  const sent5Count = sent5Res.count ?? 0;
  const completedCount = completedRes.count ?? 0;
  const stoppedCount = stoppedRes.count ?? 0;
  const failedCount = failedLogRes.count ?? 0;
  const countsByFilter: Record<StatusFilterKey, number> = {
    all: unsentCount + sent1Count + sent2Count + sent3Count + sent4Count + sent5Count + completedCount + stoppedCount,
    unsent: unsentCount,
    sent_1: sent1Count,
    sent_2: sent2Count,
    sent_3: sent3Count,
    sent_4: sent4Count,
    sent_5: sent5Count,
    customer_completed: completedCount,
    stopped: stoppedCount,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">잠재고객 DB관리</h1>
        <p className="text-sm text-gray-500">잠재고객 목록을 엑셀로 가져오고 상태를 확인합니다.</p>
      </div>

      <LeadImportForm />

      {failedCount > 0 && (
        <Link
          href="/leads/failed"
          className="block bg-red-50 border border-red-100 rounded-xl px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
        >
          ⚠️ 최근 발송 실패 {failedCount.toLocaleString()}건 있음 — 확인하기 →
        </Link>
      )}

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ key, label }) => {
          const isActive = statusFilter === key;
          return (
            <Link
              key={key}
              href={`/leads?status=${key}&limit=${leadsPerPage}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                isActive ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {label} ({countsByFilter[key].toLocaleString()})
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">총 {(totalCount ?? 0).toLocaleString()}건</p>
        <PageSizeSelect value={leadsPerPage} status={statusFilter} />
      </div>

      {leadList.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <p className="p-8 text-center text-sm text-gray-400">리드가 없습니다. 엑셀 파일을 업로드해서 가져와보세요.</p>
        </div>
      ) : (
        <LeadsTable leads={leadList} />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center gap-2">
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-gray-300 text-xs">…</span>}
                <Link
                  href={`/leads?status=${statusFilter}&page=${p}&limit=${leadsPerPage}`}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold ${
                    p === currentPage ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </Link>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
