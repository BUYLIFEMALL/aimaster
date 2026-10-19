import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="max-w-5xl mx-auto space-y-10 px-4 py-8 pb-20">
      {/* 1. 상단 히어로 배너 */}
      <div className="studio-hero">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky-600 text-white px-2.5 py-0.5 text-xs font-bold tracking-wide">
                OFFICIAL MANUAL
              </span>
              <span className="rounded-full bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 text-xs font-semibold">
                {APP_VERSION}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              대량 메일발송(Step Mail) 완전 정복 가이드
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              오픈율 40% 도달과 스팸함 직행 방지를 위한 잠재고객 DB 관리, AI 맞춤형 개인화 본문 작성,
              다중 메일 계정 분할 발송 및 5차 팔로우업 시퀀스 노하우를 상세히 안내합니다.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <Link
              href="/leads"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-700 transition-all"
            >
              <span>📋</span>
              <span>잠재고객 DB관리 이동</span>
            </Link>
            <Link
              href="/campaigns"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-sky-300 transition-all"
            >
              <span>🚀</span>
              <span>예약 발송 관리 이동</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. 4단계 스텝메일 마케팅 파이프라인 */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>⚡</span>
            <span>스텝메일 성공을 위한 4단계 마케팅 프로세스</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            콜드 메일부터 제안, 혜택 안내, 마감 팔로우업까지 체계적으로 연결되는 4단계 흐름입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="guide-card space-y-2.5 border-t-4 border-t-sky-500">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-sky-50 text-sky-700 px-2 py-0.5 text-[11px] font-bold">
                Step 1 · DB
              </span>
              <span className="text-xs text-slate-400">데이터 수집</span>
            </div>
            <h3 className="font-bold text-sm text-slate-900">리드 DB 수집 & 정제</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              잠재고객의 회사명, 담당자명, 유효한 이메일 주소를 엑셀(.xlsx)로 정리하여 업로드합니다. 중복 이메일은 자동 필터링됩니다.
            </p>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-sky-600 font-medium">
              핵심 팁: 정확한 이메일 형식 검증
            </div>
          </div>

          {/* Step 2 */}
          <div className="guide-card space-y-2.5 border-t-4 border-t-blue-500">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-bold">
                Step 2 · 초안
              </span>
              <span className="text-xs text-slate-400">개인화 작성</span>
            </div>
            <h3 className="font-bold text-sm text-slate-900">AI 초안 작성 & 개인화</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {"#{고객명}"}, {"#{회사명}"} 치환 태그를 활용해 받는 사람이 나만을 위해 쓴 편지처럼 느끼도록 자연스러운 문체로 작성합니다.
            </p>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-blue-600 font-medium">
              핵심 팁: 1차~5차 단계별 차수 기획
            </div>
          </div>

          {/* Step 3 */}
          <div className="guide-card space-y-2.5 border-t-4 border-t-indigo-500">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[11px] font-bold">
                Step 3 · 연동
              </span>
              <span className="text-xs text-slate-400">다중 계정</span>
            </div>
            <h3 className="font-bold text-sm text-slate-900">다중 SMTP 계정 연동</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              네이버, 다음, Gmail 계정을 2~3개 이상 등록해 두면, 시스템이 계정별 일일 발송 한도를 지키며 안전하게 분할 발송합니다.
            </p>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-indigo-600 font-medium">
              핵심 팁: 일일 한도 분산으로 차단 예방
            </div>
          </div>

          {/* Step 4 */}
          <div className="guide-card space-y-2.5 border-t-4 border-t-emerald-500">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-bold">
                Step 4 · 발송
              </span>
              <span className="text-xs text-slate-400">스케줄 관리</span>
            </div>
            <h3 className="font-bold text-sm text-slate-900">캠페인 스케줄링 & 발송</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              원하는 발송 일시와 배치 수량을 설정하여 캠페인을 생성하면, 클라우드 크론이 백그라운드에서 순차적으로 안전 발송합니다.
            </p>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-emerald-600 font-medium">
              핵심 팁: 발송 실패 리드 즉시 격리
            </div>
          </div>
        </div>
      </section>

      {/* 3. 이메일 프로바이더별 한도 및 비교 매트릭스 표 */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>📡</span>
            <span>이메일 프로바이더별 발송 한도 및 특성 비교</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            보유하신 메일 계정의 정책을 확인하고 최적의 발송 환경을 구성하세요.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-bold">메일 서비스</th>
                <th className="px-5 py-3.5 font-bold">일일 발송 한도</th>
                <th className="px-5 py-3.5 font-bold">권장 발송 속도</th>
                <th className="px-5 py-3.5 font-bold">연동 방식</th>
                <th className="px-5 py-3.5 font-bold">주요 특징 및 권장사항</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50">
                <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="text-emerald-500 font-extrabold">N</span>
                  <span>네이버 메일 (Naver)</span>
                </td>
                <td className="px-5 py-4 font-semibold text-slate-800">하루 최대 500건</td>
                <td className="px-5 py-4 text-sky-600 font-semibold">분당 5~10건</td>
                <td className="px-5 py-4">SMTP 사용 설정 + 2단계 인증용 앱비밀번호</td>
                <td className="px-5 py-4 text-slate-500">
                  국내 도달율 최상, 네이버 메일 환경설정에서 POP3/SMTP 허용 필수
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="text-amber-500 font-extrabold">D</span>
                  <span>다음 카카오 (Daum)</span>
                </td>
                <td className="px-5 py-4 font-semibold text-slate-800">하루 최대 500건</td>
                <td className="px-5 py-4 text-sky-600 font-semibold">분당 5~10건</td>
                <td className="px-5 py-4">카카오 계정 2단계 인증용 앱비밀번호</td>
                <td className="px-5 py-4 text-slate-500">
                  다음/한메일 고객에게 높은 도달율, 메일 설정에서 IMAP/SMTP 허용 필요
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="text-red-500 font-extrabold">G</span>
                  <span>구글 Gmail</span>
                </td>
                <td className="px-5 py-4 font-semibold text-slate-800">일반 500건 / Workspace 2,000건</td>
                <td className="px-5 py-4 text-sky-600 font-semibold">분당 10~15건</td>
                <td className="px-5 py-4">구글 보안 설정 → 16자리 앱 비밀번호</td>
                <td className="px-5 py-4 text-slate-500">
                  글로벌 표준, Workspace 유료 계정 연동 시 일일 대량 발송에 가장 안정적
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="text-blue-500 font-extrabold">💼</span>
                  <span>사내 기업 메일 (Custom SMTP)</span>
                </td>
                <td className="px-5 py-4 font-semibold text-slate-800">사내 메일 서버 정책 준수</td>
                <td className="px-5 py-4 text-sky-600 font-semibold">서버 허용치에 맞춤</td>
                <td className="px-5 py-4">호스트 주소, 포트(465/587), 계정/비밀번호</td>
                <td className="px-5 py-4 text-slate-500">
                  기업 자체 도메인 신뢰도 확보 가능, SPF/DKIM 설정이 완료된 서버 권장
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. 스팸 필터 회피 7대 황금률 */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span>🛡️</span>
          <span>스팸함 직행을 막는 이메일 마케팅 7대 황금률</span>
        </h2>
        <p className="text-xs text-slate-500">
          대량 발송 시 수신 메일 서버의 스팸 필터를 우회하고 수신함에 정상 착륙하기 위한 필수 수칙입니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-1">
            <p className="text-xs font-bold text-slate-800">1. 이미지 단독 메일 금지</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              통 이미지 하나만 넣은 메일은 99% 스팸으로 분류됩니다. 텍스트와 이미지 비율을 최소 6:4 이상 유지하세요.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-1">
            <p className="text-xs font-bold text-slate-800">2. 필수 수신거부 문구 명시</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              하단에 "본 메일은 정보통신망법에 의거 발송되었습니다. [수신거부]" 문구를 반드시 기재해야 스팸 차단을 피할 수 있습니다.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-1">
            <p className="text-xs font-bold text-slate-800">3. 개인화 치환 태그 사용</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {"#{고객명}"}, {"#{회사명}"}을 본문과 제목에 넣어 메일마다 고유한 해시값을 갖도록 하여 대량 템플릿 탐지를 우회합니다.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-1">
            <p className="text-xs font-bold text-slate-800">4. 다중 계정 분할 발송</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              하나의 메일 계정으로 수천 통을 몰아서 쏘지 말고, 2~3개 계정으로 100~200건씩 나누어 순차 발송하세요.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-1">
            <p className="text-xs font-bold text-slate-800">5. 과장 광고 키워드 자제</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              제목에 '100% 보장', '무료 당첨', '대출', 특수문자(★★★, ▼▼▼)의 과도한 반복을 피하고 정중한 비즈니스 어조를 쓰세요.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-1">
            <p className="text-xs font-bold text-slate-800">6. 실패(반송) 리드 즉시 정리</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              존재하지 않는 이메일로 계속 발송하면 발송자 IP의 평판이 급락합니다. 실패 내역을 확인해 해당 리드를 즉시 중지하세요.
            </p>
          </div>
        </div>
      </section>

      {/* 5. 100% BYOK 공용 DB 회원 소유 격리 보안 원칙 배너 */}
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50/70 via-blue-50/50 to-indigo-50/50 p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-600 text-white font-bold text-xs shadow-sm">
            🛡️
          </span>
          <h2 className="text-base font-bold text-sky-950">
            100% 회원 본인 계정(BYOK) 연동 & 공용 DB 안전 격리 원칙
          </h2>
        </div>
        <p className="text-xs text-sky-900 leading-relaxed">
          Step Mail은 회원의 개인정보와 발송 계정을 안전하게 보호합니다. 등록하신 네이버/다음/구글 메일 계정 및 앱비밀번호는
          Supabase 공용 DB의 회원 전용 레코드(`user_smtp_accounts`)에 암호화되어 안전하게 보관되며,
          오직 본인의 캠페인 발송에만 사용됩니다. 운영자 메일이나 타 회원의 계정으로 폴백되지 않으며,
          모든 리드 DB는 회원 본인만 열람할 수 있도록 RLS(행 단위 보안)가 완벽하게 적용되어 있습니다.
        </p>
        <div className="flex items-center gap-2 text-xs font-semibold text-sky-800">
          <span>✓ 다른 프로그램(crm-google-form, booking-reminder)과 1회 등록 시 즉시 호환</span>
          <span>·</span>
          <span>✓ 30일 데이터 보존 주기 준수</span>
        </div>
      </div>

      {/* 6. 자주 묻는 질문 (FAQ 6종) */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span>❓</span>
          <span>자주 묻는 질문 (FAQ)</span>
        </h2>

        <div className="space-y-3">
          <details className="group rounded-xl border border-slate-200 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-bold text-xs sm:text-sm text-slate-800">
              <span>Q1. 네이버 메일 연동 시 일반 로그인 비밀번호를 넣으면 왜 오류가 나나요?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              네이버, 다음, 구글 등 주요 포털은 보안을 위해 외부 프로그램 접속 시 기존 비밀번호가 아닌 '애플리케이션 비밀번호(앱비밀번호)' 사용을 의무화하고 있습니다. 네이버 '내정보 ➔ 보안설정 ➔ 2단계 인증 관리 ➔ 애플리케이션 비밀번호 생성'에서 발급받은 비밀번호를 입력해야 정상 연동됩니다.
            </p>
          </details>

          <details className="group rounded-xl border border-slate-200 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-bold text-xs sm:text-sm text-slate-800">
              <span>Q2. 대량 발송 시 메일 발송 속도는 어떻게 조절되나요?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              시스템 백그라운드 크론이 한 번에 수천 건을 쏟아붓지 않고, 계정당 분당 5~10건 단위로 간격을 두어 안전하게 분할 발송합니다. 이를 통해 수신 포털의 스팸 모니터링 시스템에 걸리지 않고 높은 도달율을 유지합니다.
            </p>
          </details>

          <details className="group rounded-xl border border-slate-200 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-bold text-xs sm:text-sm text-slate-800">
              <span>Q3. 엑셀 업로드 시 파일 형식과 필수 컬럼은 어떻게 되나요?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              `.xlsx` 형식 파일이어야 하며, 첫 번째 행에 '이메일'(또는 'email'), '고객명'(또는 'name'), '회사명' 등의 헤더가 포함되어야 합니다. '잠재고객 DB관리' 화면의 '양식 다운로드' 버튼을 클릭하시면 표준 엑셀 템플릿을 바로 내려받아 사용하실 수 있습니다.
            </p>
          </details>

          <details className="group rounded-xl border border-slate-200 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-bold text-xs sm:text-sm text-slate-800">
              <span>Q4. 1차 발송 후 2차, 3차 팔로우업은 어떻게 진행되나요?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              1차 발송이 완료된 리드는 대시보드에서 '1차 발송' 상태로 자동 변경됩니다. 다음 캠페인 생성 시 대상을 '1차 발송 리드'로 필터링하고 2차 팔로우업 이메일 초안을 지정하여 스케줄링하시면, 자연스럽게 단계별 시퀀스 마케팅이 진행됩니다.
            </p>
          </details>

          <details className="group rounded-xl border border-slate-200 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-bold text-xs sm:text-sm text-slate-800">
              <span>Q5. 고객이 답장을 주거나 계약이 성사되면 어떻게 처리하나요?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              리드 관리 테이블에서 해당 고객의 상태를 '고객 전환 완료' 또는 '발송 중지'로 변경하시면, 이후의 모든 예약 캠페인 대상에서 자동으로 제외되어 불필요한 메일이 더 이상 발송되지 않습니다.
            </p>
          </details>

          <details className="group rounded-xl border border-slate-200 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-bold text-xs sm:text-sm text-slate-800">
              <span>Q6. 예약 발송은 무엇으로 돌아가나요? 내 cron-job.org로 돌릴 수 있나요?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              API키등록·플랫폼연동 → ⏰ 예약 발행에서 고릅니다. 기본 「AIMaster 기본(Vercel)」은 따로 할 일 없이 매시 정각에 발송 시각이 된 캠페인을 보냅니다. 「내 cron-job.org」를 고르고 본인 무료 cron-job.org API 키를 등록하면, 캠페인을 켤 때 본인 계정에 작업이 자동으로 켜져 매시 0·30분에 확인하고, 보낼 캠페인이 없으면 자동으로 멈춥니다. 예약 발송 화면의 「예약 발송 일시정지」로 전체를 잠시 멈출 수 있습니다.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
