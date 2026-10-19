import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { LeadImportForm } from "@/components/leads/LeadImportForm";
import { LeadsTable } from "@/components/leads/LeadsTable";
import type { LeadRowData } from "@/components/leads/LeadRow";
import { PageSizeSelect } from "@/components/leads/PageSizeSelect";
import { PAGE_SIZE_OPTIONS } from "@/lib/leadsPaging";
import { STATUS_LABEL } from "@/lib/leadStatus";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_LEADS_PER_PAGE = 50;

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
  searchParams: sp,
}: {
  searchParams: Promise<{ page?: string; status?: string; limit?: string }>;
}) {
  const searchParams = await sp;
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
    const step = sentStepIndex + 1;
    countQuery = countQuery.eq("status", "new").eq("send_count", step);
    listQuery = listQuery.eq("status", "new").eq("send_count", step);
  } else if (statusFilter === "customer_completed" || statusFilter === "stopped") {
    countQuery = countQuery.eq("status", statusFilter);
    listQuery = listQuery.eq("status", statusFilter);
  }

  const [
    { count: totalCount },
    { data: leads },
    unsentRes,
    sent1Res,
    sent2Res,
    sent3Res,
    sent4Res,
    sent5Res,
    completedRes,
    stoppedRes,
    failedLogRes,
    smtpRes,
    campaignsRes,
  ] = await Promise.all([
    countQuery,
    listQuery,
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "new").eq("send_count", 0),
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "new").eq("send_count", 1),
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "new").eq("send_count", 2),
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "new").eq("send_count", 3),
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "new").eq("send_count", 4),
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "new").eq("send_count", 5),
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "customer_completed"),
    supabase.from("stepmail_leads").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "stopped"),
    supabase.from("stepmail_send_log").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "failed"),
    supabase.from("user_smtp_accounts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true),
    supabase.from("stepmail_campaigns").select("id", { count: "exact", head: true }).eq("user_id", user.id),
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
  const smtpAccountCount = smtpRes.count ?? 0;
  const campaignCount = campaignsRes.count ?? 0;

  const totalAllLeads = unsentCount + sent1Count + sent2Count + sent3Count + sent4Count + sent5Count + completedCount + stoppedCount;
  const inProgressCount = sent1Count + sent2Count + sent3Count + sent4Count + sent5Count;

  const countsByFilter: Record<StatusFilterKey, number> = {
    all: totalAllLeads,
    unsent: unsentCount,
    sent_1: sent1Count,
    sent_2: sent2Count,
    sent_3: sent3Count,
    sent_4: sent4Count,
    sent_5: sent5Count,
    customer_completed: completedCount,
    stopped: stoppedCount,
  };

  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / leadsPerPage));
  const leadList = (leads ?? []) as LeadRowData[];

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 py-8 pb-20">
      {/* 1. 상단 히어로 배너 (.studio-hero) */}
      <div className="studio-hero">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-600 text-white px-2.5 py-0.5 text-xs font-bold tracking-wide">
                FLOW WIZARD
              </span>
              <span className="rounded-full bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 text-xs font-semibold">
                {APP_VERSION}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                분할 발송 크론 디스패치 가동 중
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              대량 메일발송 마케팅 콘솔 (Step Mail)
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              잠재고객 엑셀 DB를 등록하고, 1차 안내부터 5차 팔로우업까지 AI 맞춤형 개인화 이메일을
              다중 메일 계정으로 안전하게 분할 예약 발송하는 올인원 이메일 마케팅 솔루션입니다.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <Link
              href="/guide"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-sky-300 transition-all"
            >
              <span>📖</span>
              <span>연동 & 사용 매뉴얼</span>
            </Link>
            <Link
              href="/campaigns"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-700 transition-all"
            >
              <span>🚀</span>
              <span>예약 발송 관리</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. 3대 핵심 KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: 잠재고객(리드) 총 수 */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">총 잠재고객(리드)</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 font-bold text-sm">
              📋
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{totalAllLeads.toLocaleString()}</span>
            <span className="text-xs text-slate-500">명 등록</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-slate-600 font-semibold">미발송 {unsentCount.toLocaleString()}</span>
            <span>·</span>
            <span className="text-sky-600 font-semibold">진행 중 {inProgressCount.toLocaleString()}</span>
            <span>·</span>
            <span className="text-emerald-600 font-semibold">완료 {completedCount.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI 2: 연동 발송 계정 */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">활성 발송 계정</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-sm">
              📧
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{smtpAccountCount}</span>
            <span className="text-xs text-slate-500">개 연동 중</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {smtpAccountCount > 0 ? (
              <span className="text-emerald-600 font-medium">✓ 다중 SMTP 분할 발송 활성</span>
            ) : (
              <Link href="/accounts" className="text-amber-600 font-semibold hover:underline">
                ! 발송 메일 계정을 연동해 주세요 →
              </Link>
            )}
          </div>
        </div>

        {/* KPI 3: 등록된 캠페인 */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">발송 캠페인</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm">
              🚀
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{campaignCount}</span>
            <span className="text-xs text-slate-500">개 캠페인</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            {failedCount > 0 ? (
              <span className="text-red-500 font-semibold">발송 실패 {failedCount}건</span>
            ) : (
              <span className="text-slate-500">정상 스케줄링 운영 중</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. 4단계 플로우 파이프라인 가이드 바 */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>⚡</span>
            <span>스텝메일 4단계 자동화 파이프라인</span>
          </h2>
          <span className="text-xs text-slate-400">순차적으로 진행하여 발송 성공률을 높입니다</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white">
                1
              </span>
              <span className="text-xs font-bold text-sky-900">리드 DB 업로드</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-7">
              잠재고객 엑셀 파일을 업로드하고 차수별 상태를 관리합니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 space-y-1 hover:border-slate-300 transition-all">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                2
              </span>
              <span className="text-xs font-bold text-slate-800">이메일 본문 작성</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-7">
              AI 프롬프트나 Tiptap 에디터로 개인화 초안을 작성합니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 space-y-1 hover:border-slate-300 transition-all">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                3
              </span>
              <span className="text-xs font-bold text-slate-800">SMTP 계정 연동</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-7">
              네이버, 다음, Gmail 등 발송 계정을 등록해 분할 발송합니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 space-y-1 hover:border-slate-300 transition-all">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                4
              </span>
              <span className="text-xs font-bold text-slate-800">캠페인 예약 발송</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-7">
              발송 간격과 스케줄을 지정해 1~5차 자동 팔로우업을 실행합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 4. 리드 엑셀 가져오기 폼 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-600 text-white font-bold text-xs">
              1
            </span>
            <h2 className="text-lg font-bold text-slate-900">잠재고객 엑셀 DB 가져오기</h2>
          </div>
          <span className="text-xs text-slate-400">양식 템플릿에 맞추어 엑셀(.xlsx)을 업로드하세요</span>
        </div>
        <LeadImportForm />
      </div>

      {/* 발송 실패 알림 바 */}
      {failedCount > 0 && (
        <Link
          href="/leads/failed"
          className="flex items-center justify-between rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>최근 발송 실패 {failedCount.toLocaleString()}건이 감지되었습니다. 사유를 확인해 보세요.</span>
          </div>
          <span>실패 내역 확인하기 →</span>
        </Link>
      )}

      {/* 5. 차수별 필터 칩 & 테이블 */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📊</span>
              <span>잠재고객 목록 및 발송 차수 관리</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              차수별 필터를 클릭해 각 단계별 리드를 확인하고 관리할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <p className="text-xs font-semibold text-slate-600">
              필터 결과: {(totalCount ?? 0).toLocaleString()}건
            </p>
            <PageSizeSelect value={leadsPerPage} status={statusFilter} />
          </div>
        </div>

        {/* 필터 칩셋 */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ key, label }) => {
            const isActive = statusFilter === key;
            return (
              <Link
                key={key}
                href={`/leads?status=${key}&limit=${leadsPerPage}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-sky-600 text-white shadow-sm ring-2 ring-sky-100"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {label} ({countsByFilter[key].toLocaleString()})
              </Link>
            );
          })}
        </div>

        {/* 테이블 본문 */}
        {leadList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-2xl text-sky-600 mb-3">
              📋
            </div>
            <h3 className="text-sm font-bold text-slate-800">해당 조건의 리드가 없습니다</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              상단의 "엑셀 파일 가져오기"로 새로운 고객 DB를 등록하거나, 다른 필터 칩을 선택해 보세요.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <LeadsTable leads={leadList} />
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center gap-1.5">
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-slate-300 text-xs px-1">…</span>}
                  <Link
                    href={`/leads?status=${statusFilter}&page=${p}&limit=${leadsPerPage}`}
                    className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                      p === currentPage
                        ? "bg-sky-600 text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </Link>
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
