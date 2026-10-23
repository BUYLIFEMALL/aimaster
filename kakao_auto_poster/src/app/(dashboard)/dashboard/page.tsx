import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ count: topicCount }, { count: activeTopicCount }, { count: reportCount }, { data: program }] =
    await Promise.all([
      supabase.from("kakao_topics").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("kakao_topics")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true),
      supabase.from("kakao_reports").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      (supabase as unknown as { from: (table: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from("programs")
        .select("description, short_desc")
        .eq("slug", "kakao-auto-posting")
        .maybeSingle() as Promise<{ data: { description: string | null; short_desc: string | null } | null }>,
    ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ── 1. 카카오 옐로우 뉴스레터 스튜디오 히어로 배너 ── */}
      <section className="studio-hero p-6 sm:p-8 relative">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/20">
            <span>💬 카카오톡 뉴스레터 마케팅</span>
            <span className="w-1 h-1 rounded-full bg-amber-400" />
            <span className="text-amber-300 font-black">{APP_VERSION}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            카카오톡 뉴스레터 자동화 스튜디오
          </h1>

          <p className="text-xs sm:text-sm text-neutral-200 font-medium leading-relaxed">
            관심 주제만 등록하면 AI(Perplexity·OpenAI)가 실시간 웹 정보를 분석하여
            <br className="hidden sm:inline" />
            고품질 리포트를 자동 생성하고 카카오톡 채팅방과 그룹으로 즉시 전송합니다.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/topics"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-900 text-xs sm:text-sm font-black shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <span>📌 관심 주제 등록하기</span>
              <span>→</span>
            </Link>
            <Link
              href="/guide"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm font-bold backdrop-blur-md border border-white/20 transition-all"
            >
              <span>📖 연동 & 사용 매뉴얼</span>
            </Link>
          </div>
        </div>

        {/* 장식용 카카오 말풍선 아이콘 */}
        <div className="absolute right-4 -bottom-4 text-7xl sm:text-8xl opacity-15 select-none pointer-events-none hidden md:block">
          💬
        </div>
      </section>

      {/* ── 2. 프로그램 소개 배너 ── */}
      {(program?.description || program?.short_desc) && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">💡</span>
            <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
              프로그램 소개 및 핵심 가치
            </h2>
          </div>
          {splitIntoSentenceParagraphs(program.description || program.short_desc || "").map((sentence, i) => (
            <p key={i} className="mb-1.5 text-xs sm:text-sm leading-relaxed text-neutral-600 last:mb-0">
              {sentence}
            </p>
          ))}
        </section>
      )}

      {/* ── 3. 3대 핵심 KPI 통계 카드 ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0">
              📌
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500">등록된 관심 주제</p>
              <p className="text-xl font-black text-neutral-900">{topicCount ?? 0}개</p>
              <p className="text-[11px] text-amber-700 font-medium mt-0.5">키워드 모니터링</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0">
              🔔
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500">활성 예약 모니터링</p>
              <p className="text-xl font-black text-emerald-600">{activeTopicCount ?? 0}개</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">자동 스케줄링 가동</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl shrink-0">
              📰
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500">생성된 뉴스레터</p>
              <p className="text-xl font-black text-neutral-900">{reportCount ?? 0}건</p>
              <p className="text-[11px] text-blue-600 font-medium mt-0.5">발송 완료 리포트</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. 4단계 뉴스레터 발송 파이프라인 가이드 바 ── */}
      <section className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs sm:text-sm font-bold text-neutral-900 flex items-center gap-2">
            <span>🚀</span>
            <span>카카오톡 뉴스레터 자동화 4단계 흐름</span>
          </h2>
          <span className="text-[11px] text-neutral-400 font-medium hidden sm:inline">
            등록해 두면 AI가 자동으로 분석하여 정기 발송합니다
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-left">
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white mb-1">
              STEP 1
            </span>
            <p className="text-xs font-bold text-neutral-900">관심 주제 등록</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">키워드 & 주기 설정</p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60 text-left">
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-600 text-white mb-1">
              STEP 2
            </span>
            <p className="text-xs font-bold text-neutral-900">AI 리포트 생성</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">웹 정보 실시간 분석</p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60 text-left">
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-600 text-white mb-1">
              STEP 3
            </span>
            <p className="text-xs font-bold text-neutral-900">수신자 그룹 관리</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">전화번호 & 태그 지정</p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60 text-left">
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-600 text-white mb-1">
              STEP 4
            </span>
            <p className="text-xs font-bold text-neutral-900">카카오톡 자동 발송</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">원클릭 공유 & 발송추적</p>
          </div>
        </div>
      </section>

      {/* ── 5. 단계별 사용방법 가이드 ── */}
      <section className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
          <span>📖</span>
          <span>빠른 시작 & 단계별 사용방법</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-neutral-600">
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1">
            <p className="font-bold text-neutral-800 flex items-center gap-1.5">
              <span className="text-amber-600 font-black">1.</span>
              <Link href="/settings" className="text-blue-600 hover:underline">
                API 키 및 카카오 연동
              </Link>
            </p>
            <p className="text-neutral-500 leading-relaxed">
              OpenAI/Perplexity API 키를 등록하고, 카카오톡 나에게 보내기 OAuth 권한을 1회 연결합니다.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1">
            <p className="font-bold text-neutral-800 flex items-center gap-1.5">
              <span className="text-amber-600 font-black">2.</span>
              <Link href="/topics" className="text-blue-600 hover:underline">
                관심 주제 및 키워드 등록
              </Link>
            </p>
            <p className="text-neutral-500 leading-relaxed">
              정보를 수집할 주제와 키워드(최대 10개)를 등록하고, 예약 리포트 알림 주기를 켭니다.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1">
            <p className="font-bold text-neutral-800 flex items-center gap-1.5">
              <span className="text-amber-600 font-black">3.</span>
              <Link href="/reports" className="text-blue-600 hover:underline">
                생성된 리포트 검수 및 공유
              </Link>
            </p>
            <p className="text-neutral-500 leading-relaxed">
              AI가 작성한 뉴스를 확인하고, 💬 카카오톡 공유 버튼으로 단체 채팅방에 원클릭 전송합니다.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1">
            <p className="font-bold text-neutral-800 flex items-center gap-1.5">
              <span className="text-amber-600 font-black">4.</span>
              <Link href="/recipients" className="text-blue-600 hover:underline">
                수신자 목록 및 발송 내역
              </Link>
            </p>
            <p className="text-neutral-500 leading-relaxed">
              함께 받아볼 사람을 등록하고, <Link href="/broadcast-log" className="text-blue-600 hover:underline">발송 내역</Link>에서 성공/실패 여부를 모니터링합니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
