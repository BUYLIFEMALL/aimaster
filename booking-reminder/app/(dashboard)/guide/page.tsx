import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* 1. 상단 히어로 배너 */}
      <div className="studio-hero">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-600 text-white px-2.5 py-0.5 text-xs font-bold tracking-wide">
                OFFICIAL MANUAL
              </span>
              <span className="rounded-full bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 text-xs font-semibold">
                {APP_VERSION}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              예약 리마인드 자동화 완전 정복 가이드
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              노쇼(No-Show) 없는 예약 비즈니스를 위한 4단계 리마인드 시퀀스 구축법과
              카카오 알림톡·문자·이메일 발송 채널 연동 방법을 상세히 안내합니다.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <Link
              href="/reservations"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all"
            >
              <span>📅</span>
              <span>예약 관리 콘솔로 이동</span>
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-blue-300 transition-all"
            >
              <span>🔑</span>
              <span>발송 계정 연동 설정</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. 4단계 노쇼 방지 리마인드 시퀀스 파이프라인 */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>⏱️</span>
            <span>추천 4단계 리마인드 시퀀스 파이프라인</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            가장 검증된 노쇼 감소 시퀀스로, 예약 전부터 방문 후 리뷰 유도까지 자동으로 연결됩니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="guide-card space-y-2.5 border-t-4 border-t-blue-500">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-bold">
                Step 1 · D-3
              </span>
              <span className="text-xs text-slate-400">예약 3일 전</span>
            </div>
            <h3 className="font-bold text-sm text-slate-900">예약 확인 & 사전 준비</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              예약 일시 확인과 함께 오실 때 지참물, 금식 여부, 주차 및 찾아오시는 길 링크를 사전 안내합니다.
            </p>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-blue-600 font-medium">
              추천 채널: 이메일 또는 알림톡
            </div>
          </div>

          {/* Step 2 */}
          <div className="guide-card space-y-2.5 border-t-4 border-t-indigo-500">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[11px] font-bold">
                Step 2 · D-1
              </span>
              <span className="text-xs text-slate-400">전날 오후 2시</span>
            </div>
            <h3 className="font-bold text-sm text-slate-900">최종 참석 여부 재확인</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              내일 예약 일정을 상기시키고, 불가피한 일정 변경이나 취소가 필요할 경우 미리 연락을 유도하여 노쇼를 사전 방지합니다.
            </p>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-indigo-600 font-medium">
              추천 채널: 카카오 알림톡 / SMS
            </div>
          </div>

          {/* Step 3 */}
          <div className="guide-card space-y-2.5 border-t-4 border-t-emerald-500">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-bold">
                Step 3 · 당일
              </span>
              <span className="text-xs text-slate-400">방문 3시간 전</span>
            </div>
            <h3 className="font-bold text-sm text-slate-900">방문 직전 위치 & 주차 안내</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              방문 당일 정확한 매장 위치, 층수, 주차 등록 방법, 지각 시 대기 시간 안내 등을 전송해 정시 도착을 돕습니다.
            </p>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-emerald-600 font-medium">
              추천 채널: SMS / 카카오 알림톡
            </div>
          </div>

          {/* Step 4 */}
          <div className="guide-card space-y-2.5 border-t-4 border-t-amber-500">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-bold">
                Step 4 · 방문 후
              </span>
              <span className="text-xs text-slate-400">방문 2시간 후</span>
            </div>
            <h3 className="font-bold text-sm text-slate-900">방문 감사 & 리뷰 작성 유도</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              방문 감사 인사와 함께 네이버 플레이스 영수증 리뷰나 구글 지도 리뷰 링크를 제공해 재방문과 바이럴 효과를 극대화합니다.
            </p>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-amber-600 font-medium">
              추천 채널: 카카오 알림톡 / SMS
            </div>
          </div>
        </div>
      </section>

      {/* 3. 발송 채널별 비교 & 특징 매트릭스 표 */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>📡</span>
            <span>발송 채널별 특징 및 비교 매트릭스</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            보유하신 계정에 맞추어 원하는 채널을 자유롭게 조합하여 사용할 수 있습니다.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-bold">채널</th>
                <th className="px-5 py-3.5 font-bold">제공 프로바이더</th>
                <th className="px-5 py-3.5 font-bold">비용 (건당)</th>
                <th className="px-5 py-3.5 font-bold">권장 용도</th>
                <th className="px-5 py-3.5 font-bold">특징 및 장점</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50">
                <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-1.5">
                  <span>💬</span>
                  <span>카카오 알림톡</span>
                </td>
                <td className="px-5 py-4 font-medium text-slate-700">SOLAPI (카카오 비즈니스)</td>
                <td className="px-5 py-4 text-emerald-600 font-semibold">약 6.5원 ~ 8원</td>
                <td className="px-5 py-4">D-1 확인, 당일 안내, 리뷰 유도</td>
                <td className="px-5 py-4 text-slate-500">
                  카카오 인증 마크와 버튼 링크(예약 확인/지도) 탑재 가능, 높은 오픈율
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-1.5">
                  <span>📱</span>
                  <span>문자(SMS/LMS)</span>
                </td>
                <td className="px-5 py-4 font-medium text-slate-700">SOLAPI</td>
                <td className="px-5 py-4 text-slate-700 font-semibold">SMS 약 10원 / LMS 약 30원</td>
                <td className="px-5 py-4">카카오톡 미설치 고객, 당일 긴급 안내</td>
                <td className="px-5 py-4 text-slate-500">
                  알림톡 실패 시 자동으로 문자로 폴백 발송 가능, 100% 도달 보장
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-1.5">
                  <span>✉️</span>
                  <span>이메일 (SMTP)</span>
                </td>
                <td className="px-5 py-4 font-medium text-slate-700">네이버 / 다음 / 구글 메일</td>
                <td className="px-5 py-4 text-emerald-600 font-semibold">무료 (일일 발송 한도 내)</td>
                <td className="px-5 py-4">D-3 장문 안내, 견적서/사전 서식 전달</td>
                <td className="px-5 py-4 text-slate-500">
                  별도 유료 충전 없이 네이버/구글 메일 계정 연동만으로 즉시 발송 가능
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-1.5">
                  <span>🤖</span>
                  <span>텔레그램 봇</span>
                </td>
                <td className="px-5 py-4 font-medium text-slate-700">Telegram Bot API</td>
                <td className="px-5 py-4 text-emerald-600 font-semibold">완전 무료</td>
                <td className="px-5 py-4">관리자 실시간 예약 알림 모니터링</td>
                <td className="px-5 py-4 text-slate-500">
                  신규 예약 접수나 노쇼 발생 시 관리자 스마트폰으로 즉시 푸시 알림
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. 메시지 치환 태그 가이드 */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span>🏷️</span>
          <span>동적 메시지 치환 태그 사용법</span>
        </h2>
        <p className="text-xs text-slate-500">
          규칙 설정 시 본문이나 이메일 제목에 아래 태그를 입력하면, 발송 시 고객별 정보로 자동 치환됩니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
            <code className="text-xs font-bold text-blue-600">{"#{고객명}"}</code>
            <p className="text-xs text-slate-700 font-medium mt-1">예약 고객의 성함</p>
            <p className="text-[11px] text-slate-400 mt-0.5">예: 홍길동님</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
            <code className="text-xs font-bold text-blue-600">{"#{예약일시}"}</code>
            <p className="text-xs text-slate-700 font-medium mt-1">예약된 날짜와 시간</p>
            <p className="text-[11px] text-slate-400 mt-0.5">예: 2026년 10월 25일 14:00</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
            <code className="text-xs font-bold text-blue-600">{"#{메모}"}</code>
            <p className="text-xs text-slate-700 font-medium mt-1">시술/상담 항목 또는 특이사항</p>
            <p className="text-[11px] text-slate-400 mt-0.5">예: 퍼스널 컬러 1인 코스</p>
          </div>
        </div>
      </section>

      {/* 5. 100% BYOK 공용 DB 회원 소유 격리 보안 원칙 배너 */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-blue-50/50 p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm">
            🛡️
          </span>
          <h2 className="text-base font-bold text-emerald-950">
            100% 본인 계정 연동(BYOK) & 공용 DB 안전 격리 원칙
          </h2>
        </div>
        <p className="text-xs text-emerald-900 leading-relaxed">
          AIMaster는 회원의 안전과 개인정보 보호를 최우선으로 합니다. 회원이 등록한 SOLAPI API 키,
          네이버/다음 메일 SMTP 로그인 정보는 암호화되어 공용 DB의 회원 전용 레코드에 안전하게 저장되며,
          오직 본인의 예약 발송에만 사용됩니다. 운영자 키나 타 회원의 계정으로 폴백되지 않으며,
          모든 고객 데이터는 30일 보존 원칙에 따라 안전하게 보호됩니다.
        </p>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
          <span>✓ Supabase RLS(행 단위 보안) 완벽 적용</span>
          <span>·</span>
          <span>✓ 다른 프로그램(crm-google-form 등)과 1회 등록 시 즉시 호환</span>
        </div>
      </div>

      {/* 6. 자주 묻는 질문 (FAQ 5종) */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span>❓</span>
          <span>자주 묻는 질문 (FAQ)</span>
        </h2>

        <div className="space-y-3">
          <details className="group rounded-xl border border-slate-200 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-bold text-xs sm:text-sm text-slate-800">
              <span>Q1. 15분 크론은 어떤 주기로 어떻게 동작하나요?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              클라우드 Vercel Cron이 매 15분마다 안전한 Bearer 인증을 통해 시스템을 순회합니다. 현재 시간과 예약 일시, 그리고 활성화된 리마인드 규칙의 오프셋(예: 예약 24시간 전)을 계산하여 발송 대상 고객을 자동으로 감지하고 메시지를 전송합니다. 이미 발송된 건은 이력 테이블에 기록되어 중복 발송되지 않습니다.
            </p>
          </details>

          <details className="group rounded-xl border border-slate-200 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-bold text-xs sm:text-sm text-slate-800">
              <span>Q2. 이미 crm-google-form 등에서 메일이나 SOLAPI를 등록했는데 또 등록해야 하나요?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              아닙니다! 네이버 메일(SMTP)과 SOLAPI(카카오톡/문자) 계정은 AIMaster 공용 계정 테이블에 연동되어 있어, 한 번 등록해 두셨다면 별도 추가 설정 없이 즉시 연동되어 표시됩니다. 단, 텔레그램 알림 봇은 프로그램별 독립 알림을 위해 각 프로그램 설정에서 개별 연동됩니다.
            </p>
          </details>

          <details className="group rounded-xl border border-slate-200 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-bold text-xs sm:text-sm text-slate-800">
              <span>Q3. 카카오 알림톡 템플릿 검수는 어떻게 진행하나요?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              카카오 알림톡은 정보성 메시지만 발송할 수 있으므로 카카오 비즈니스 센터 또는 SOLAPI 콘솔에서 템플릿(예약 안내 양식)을 먼저 등록하고 승인을 받아야 합니다. 승인 완료된 템플릿 코드(예: KA01TP240819)를 규칙 추가 폼의 알림톡 템플릿 ID 필드에 입력하시면 연동됩니다. 승인 전까지는 SMS 문자로 먼저 운영하실 수 있습니다.
            </p>
          </details>

          <details className="group rounded-xl border border-slate-200 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-bold text-xs sm:text-sm text-slate-800">
              <span>Q4. 고객이 예약을 취소하면 리마인드가 계속 나가나요?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              아닙니다. 예약 관리 목록에서 해당 고객의 상태를 '예약 취소' 또는 '노쇼'로 변경하거나 삭제하시면, 크론 발송 대상 쿼리에서 즉시 제외되어 이후의 모든 자동 알림 발송이 즉시 중단됩니다.
            </p>
          </details>

          <details className="group rounded-xl border border-slate-200 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-bold text-xs sm:text-sm text-slate-800">
              <span>Q5. 핸드폰 번호 필수 정책이란 무엇인가요?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              AIMaster 플랫폼 보안 지침에 따라 알림톡·문자 자동 발송 등 통신 서비스를 이용하는 회원은 메인 사이트(buylife.xyz) 내 정보 설정에서 본인 핸드폰 번호를 필수로 등록하셔야 합니다. 관리자 계정을 제외한 미등록 회원의 크론 자동 발송은 안전을 위해 일시 차단되므로 메인 사이트 프로필에서 번호를 먼저 등록해 주시기 바랍니다.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
