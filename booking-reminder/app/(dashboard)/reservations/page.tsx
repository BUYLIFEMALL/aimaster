import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { ReservationCreateForm } from "@/components/reservations/ReservationCreateForm";
import { ReservationImportForm } from "@/components/reservations/ReservationImportForm";
import { ReservationRow, type ReservationData } from "@/components/reservations/ReservationRow";
import { ReminderRulesSection, type ReminderRuleData } from "@/components/reservations/ReminderRulesSection";
import { APP_VERSION } from "@/lib/version";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberSchedulerState } from "@/lib/schedulerMember/memberScheduler";
import { SchedulePublishingControl } from "@/components/reservations/SchedulePublishingControl";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ReservationsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [
    { data: reservations },
    { data: rules },
    { data: solapiAccount },
    { data: smtpAccounts },
    { data: telegramLink },
  ] = await Promise.all([
    supabase
      .from("booking_reservations")
      .select("id, customer_name, customer_phone, customer_email, reservation_at, memo, status")
      .eq("user_id", user.id)
      .order("reservation_at", { ascending: true }),
    supabase
      .from("booking_reminder_rules")
      .select(
        "id, name, offset_minutes, channel_email, channel_sms, channel_alimtalk, channel_friendtalk, message_subject, message_text, kakao_template_id, kakao_variables, is_active",
      )
      .eq("user_id", user.id)
      .order("offset_minutes", { ascending: true }),
    supabase
      .from("user_solapi_accounts")
      .select("api_key, sender_phone")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_smtp_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase
      .from("user_telegram_links")
      .select("bot_username")
      .eq("user_id", user.id)
      .eq("program_slug", "booking-reminder")
      .maybeSingle(),
  ]);

  const reservationList = (reservations ?? []) as ReservationData[];
  const ruleList = (rules ?? []) as ReminderRuleData[];
  const activeRuleCount = ruleList.filter((r) => r.is_active).length;

  // 채널 연동 수 계산
  let connectedChannelsCount = 0;
  if (solapiAccount?.api_key) connectedChannelsCount += 1;
  if ((smtpAccounts ?? []).length > 0) connectedChannelsCount += 1;
  if (telegramLink?.bot_username) connectedChannelsCount += 1;

  // 예약 상태별 카운트
  const bookedCount = reservationList.filter((r) => r.status === "booked").length;
  const completedCount = reservationList.filter((r) => r.status === "completed").length;
  const noShowCount = reservationList.filter((r) => r.status === "no_show").length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* 1. 상단 히어로 배너 (.studio-hero) */}
      <div className="studio-hero">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-600 text-white px-2.5 py-0.5 text-xs font-bold tracking-wide">
                FLOW WIZARD
              </span>
              <span className="rounded-full bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 text-xs font-semibold">
                {APP_VERSION}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                15분 주기 자동 크론 가동 중
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              예약(취소)방지 리마인드 콘솔
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              고객 예약일시 전후로 알림톡·문자·이메일·텔레그램 알림을 자동 전송하여 노쇼(No-Show)를
              예방하고, 방문 완료 후 리뷰 작성까지 매끄럽게 유도하는 자동화 솔루션입니다.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <Link
              href="/guide"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-blue-300 transition-all"
            >
              <span>📖</span>
              <span>연동 & 사용 매뉴얼</span>
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all"
            >
              <span>🔑</span>
              <span>발송 계정 설정</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. 3대 핵심 KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: 예약 관리 현황 */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">총 등록 예약</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-sm">
              📅
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{reservationList.length}</span>
            <span className="text-xs text-slate-500">건</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-blue-600 font-semibold">예약 {bookedCount}</span>
            <span>·</span>
            <span className="text-emerald-600 font-semibold">완료 {completedCount}</span>
            {noShowCount > 0 && (
              <>
                <span>·</span>
                <span className="text-red-500 font-semibold">노쇼 {noShowCount}</span>
              </>
            )}
          </div>
        </div>

        {/* KPI 2: 활성 리마인드 규칙 */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">리마인드 규칙</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm">
              ⚙️
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{activeRuleCount}</span>
            <span className="text-xs text-slate-500">개 가동 중 / 총 {ruleList.length}개</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {activeRuleCount > 0 ? (
              <span className="text-emerald-600 font-medium">✓ 실시간 조건 매칭 활성</span>
            ) : (
              <span className="text-amber-600 font-medium">! 활성화된 규칙을 등록하세요</span>
            )}
          </div>
        </div>

        {/* KPI 3: 연동 발송 채널 상태 */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">발송 채널 연동</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm">
              📡
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{connectedChannelsCount}</span>
            <span className="text-xs text-slate-500">/ 3개 채널 연결</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span className={solapiAccount?.api_key ? "text-emerald-600 font-semibold" : "text-slate-400"}>
              알림톡/문자 {solapiAccount?.api_key ? "✓" : "○"}
            </span>
            <span>·</span>
            <span className={(smtpAccounts ?? []).length > 0 ? "text-emerald-600 font-semibold" : "text-slate-400"}>
              이메일 {(smtpAccounts ?? []).length > 0 ? "✓" : "○"}
            </span>
            <span>·</span>
            <span className={telegramLink?.bot_username ? "text-emerald-600 font-semibold" : "text-slate-400"}>
              텔레그램 {telegramLink?.bot_username ? "✓" : "○"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. 3단계 플로우 파이프라인 가이드 바 */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>⚡</span>
            <span>자동 리마인드 3단계 파이프라인</span>
          </h2>
          <span className="text-xs text-slate-400">순차적 흐름으로 자동 운영됩니다</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                1
              </span>
              <span className="text-xs font-bold text-blue-900">예약 접수 & 등록</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-7">
              고객명, 예약일시, 연락처를 등록하거나 시스템을 통해 연동합니다.
            </p>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                2
              </span>
              <span className="text-xs font-bold text-indigo-900">시퀀스 규칙 설정</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-7">
              예약 전/후 원하는 시점(D-3, D-1, 당일 등)과 발송 채널을 지정합니다.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                3
              </span>
              <span className="text-xs font-bold text-emerald-900">15분 자동 발송</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-7">
              클라우드 크론이 15분마다 조건 일치 건을 찾아 자동으로 알림을 발송합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 4. 예약 등록 폼 섹션 */}
      <div id="create" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
              1
            </span>
            <h2 className="text-lg font-bold text-slate-900">예약 접수 및 등록</h2>
          </div>
          <span className="text-xs text-slate-400">문자/카카오톡 발송을 위해 연락처를 입력하세요</span>
        </div>
        <ReservationCreateForm />
        <div className="mt-4">
          <ReservationImportForm />
        </div>
      </div>

      {/* 5. 리마인드 규칙 설정 섹션 */}
      <div id="rules" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
              2
            </span>
            <h2 className="text-lg font-bold text-slate-900">리마인드 시퀀스 규칙</h2>
          </div>
          <span className="text-xs text-slate-400">언제 어떤 채널로 발송할지 조건을 정의합니다</span>
        </div>
        <SchedulePublishingControl initial={await memberSchedulerState(createAdminClient() as unknown as SupabaseClient, user.id)} />
        <ReminderRulesSection rules={ruleList} />
      </div>

      {/* 6. 예약 목록 및 상태 관리 섹션 */}
      <div id="list" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs">
              3
            </span>
            <h2 className="text-lg font-bold text-slate-900">예약 목록 및 상태 관리</h2>
            <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-bold">
              총 {reservationList.length}건
            </span>
          </div>
          <span className="text-xs text-slate-400">방문완료/노쇼/취소 상태를 업데이트할 수 있습니다</span>
        </div>

        <div className="space-y-2.5">
          {reservationList.map((reservation) => (
            <ReservationRow key={reservation.id} reservation={reservation} />
          ))}

          {reservationList.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600 mb-3">
                📅
              </div>
              <h3 className="text-sm font-bold text-slate-800">아직 등록된 예약이 없습니다</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                위의 "예약 등록" 폼에서 첫 예약을 등록하거나, 리마인드 규칙을 먼저 설정해 보세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
