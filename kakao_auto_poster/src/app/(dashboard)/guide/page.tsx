import Link from "next/link";
import { APP_VERSION } from "@/lib/version";

export const metadata = {
  title: "연동 & 사용 매뉴얼 — 카카오톡 뉴스레터 자동화",
  description: "카카오톡 뉴스레터 자동화 완벽 매뉴얼, 발송 채널별 기능 매트릭스 표, 오픈율 극대화 7대 수칙 및 FAQ",
};

const CHANNEL_MATRIX = [
  {
    channel: "카카오톡 나에게 보내기",
    badge: "기본 제공 (무료)",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    authRequirement: "카카오 로그인 1회 OAuth 동의",
    target: "로그인한 관리자 본인 카카오톡",
    cost: "전액 무료 (API 쿼터 내)",
    bestFor: "매일 아침/저녁 최신 트렌드 리포트 개인 모니터링",
  },
  {
    channel: "카카오톡 친구톡/알림톡",
    badge: "대량 발송 지원",
    badgeColor: "bg-yellow-100 text-yellow-900 border-yellow-300",
    authRequirement: "Solapi(솔라피) API 키 및 발신번호 등록",
    target: "등록된 수신자 그룹 (전화번호 기반)",
    cost: "건당 15~20원 (Solapi 충전금)",
    bestFor: "고객사, 단체 회원, 사내 팀원 대상 정기 뉴스레터 대량 배포",
  },
  {
    channel: "텔레그램 사전 승인 봇",
    badge: "검수 후 발송",
    badgeColor: "bg-sky-100 text-sky-800 border-sky-300",
    authRequirement: "텔레그램 봇 토큰 및 Chat ID 등록",
    target: "관리자 텔레그램 대화방",
    cost: "전액 무료",
    bestFor: "AI 생성 리포트 사전 검수 후 승인 버튼 눌러 즉시 발행",
  },
  {
    channel: "이메일 알림 (SMTP)",
    badge: "보조 채널",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
    authRequirement: "네이버/Gmail SMTP 계정 연동",
    target: "등록된 이메일 주소",
    cost: "전액 무료 (포털 메일 SMTP)",
    bestFor: "카카오톡 미수신자 백업 전송 및 롱폼 아카이빙",
  },
];

const SEVEN_RULES = [
  {
    number: "01",
    title: "첫 2줄 핵심 3줄 요약 (Hooking)",
    desc: "카카오톡 메시지는 미리보기 화면에서 첫 2~3줄이 결정적입니다. 본문 핵심 결론을 상단에 불릿 포인트로 배치하여 즉각적인 클릭을 유도하세요.",
    tag: "첫인상 결정",
  },
  {
    number: "02",
    title: "타깃 맞춤형 키워드 세분화",
    desc: "너무 넓은 주제보다 'AI 코딩 툴', '부동산 실거래가 동향'처럼 수신자 그룹의 관심사에 직결되는 고밀도 키워드 3~5개를 집중 등록하세요.",
    tag: "관심도 극대화",
  },
  {
    number: "03",
    title: "발행 주기와 출퇴근 시간대 최적화",
    desc: "직장인과 현대인은 오전 8시~9시(출근길)와 오후 6시~8시(퇴근길)에 카카오톡 확인율이 가장 높습니다. 동작 시간대를 08:00~09:00로 지정하세요.",
    tag: "타이밍 전략",
  },
  {
    number: "04",
    title: "신뢰할 수 있는 출처 명시",
    desc: "AI가 수집한 정보의 공신력을 위해 리포트 하단에 원문 기사 및 데이터 소스 링크가 포함되어 있는지 확인하고 신뢰를 구축하세요.",
    tag: "공신력 확보",
  },
  {
    number: "05",
    title: "수신자 그룹별 맞춤 타깃팅",
    desc: "VIP 고객, 내부 팀원, 일반 구독자 그룹을 분리 등록하여 각 그룹의 필요에 맞는 주제 리포트만 선별 발송하세요.",
    tag: "그룹 세분화",
  },
  {
    number: "06",
    title: "텔레그램 사전 검수 파이프라인 활용",
    desc: "대량 발송 전 텔레그램 검수 봇으로 먼저 받아보고, 팩트 체크와 오탈자를 검수한 뒤 '발행' 버튼을 눌러 안전성을 확보하세요.",
    tag: "품질 관리",
  },
  {
    number: "07",
    title: "원클릭 웹 뷰 공유 링크 적극 활용",
    desc: "카카오톡 텍스트 길이 제한을 넘는 풍부한 분석 표와 그래프는 [자세히 보기] 웹 공유 링크를 통해 모바일 최적화 화면으로 제공하세요.",
    tag: "완독률 제고",
  },
];

const FAQ_LIST = [
  {
    q: "카카오톡 나에게 보내기는 어떻게 연동하나요?",
    a: "[API키등록·플랫폼연동] 메뉴에서 '카카오 로그인으로 연결' 버튼을 클릭하여 본인의 카카오 계정으로 1회 로그인하고 '나에게 메시지 보내기' 권한에 동의하시면 즉시 연동됩니다. 별도의 복잡한 개발자 키 발급 없이 원클릭으로 완료됩니다.",
  },
  {
    q: "뉴스레터 자동 생성을 위해 어떤 AI 키가 필요한가요?",
    a: "실시간 최신 웹 정보 수집과 리서치를 위해 'Perplexity' API 키가 권장되며, 리포트 본문 구조화 및 카피라이팅 작성을 위해 'OpenAI' API 키가 필요합니다. 카드 썸네일 이미지를 자동 생성하시려면 'Google Gemini' 키도 함께 등록해 주시면 좋습니다.",
  },
  {
    q: "다른 사람이나 단체 채팅방에도 자동으로 발송할 수 있나요?",
    a: "네! 두 가지 방법이 있습니다. 첫째, [생성리포트 목록]에서 '💬 카카오톡 공유' 버튼을 누르면 원하는 단체방이나 친구를 골라 무료로 즉시 공유하실 수 있습니다. 둘째, [카카오톡 수신자 목록]에 전화번호를 등록하고 Solapi(알림톡/친구톡) 키를 등록하시면 예약된 시간에 수백 명에게 일괄 자동 발송됩니다.",
  },
  {
    q: "예약 리포트는 언제 자동으로 생성되고 발송되나요?",
    a: "[관심 주제 등록]에서 '🔔 예약 리포트 알림'을 켜고 주기(매일/특정 요일)와 동작 시간대(예: 08:00~10:00)를 설정하시면, AIMaster의 15분 주기 크론(Cron) 스케줄러가 해당 시간대에 자동으로 최신 정보를 모아 리포트를 생성하고 발송합니다.",
  },
  {
    q: "수신자 전화번호나 개인정보는 안전하게 보관되나요?",
    a: "AIMaster는 멀티테넌시 원칙과 엄격한 Row Level Security(RLS)를 적용하여, 회원님이 등록하신 수신자 전화번호, 이메일, API 키는 회원 본인의 고유 계정에만 완벽히 격리 암호화 보관되며, 다른 회원이나 외부에 절대 공유되지 않습니다.",
  },
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* ── 1. 상단 히어로 배너 ── */}
      <section className="studio-hero p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/20">
              <span>📖 공식 사용자 가이드북</span>
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              <span className="text-amber-300 font-black">{APP_VERSION}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              카카오톡 뉴스레터 자동화 완벽 매뉴얼
            </h1>
            <p className="text-xs sm:text-sm text-neutral-200 font-medium leading-relaxed">
              관심 키워드 등록부터 카카오톡·텔레그램·이메일 멀티채널 자동 발송 및 오픈율 3배 극대화 수칙까지!
            </p>
          </div>

          <Link
            href="/dashboard"
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-900 text-xs sm:text-sm font-black shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <span>🏠 대시보드로 돌아가기</span>
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* ── 2. 4단계 뉴스레터 자동화 워크플로우 ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-neutral-900 flex items-center gap-2">
            <span>🚀</span>
            <span>카카오톡 뉴스레터 4단계 자동화 프로세스</span>
          </h2>
          <span className="text-xs text-neutral-500 font-medium">단 1회 설정으로 매일 자동 발행</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="guide-card border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                STEP 01
              </span>
              <span className="text-xl">📌</span>
            </div>
            <h3 className="text-sm font-black text-neutral-900 mb-1">주제 및 키워드 등록</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              수집할 관심 주제와 키워드를 최대 10개까지 등록하고 리서치 기간을 설정합니다.
            </p>
          </div>

          <div className="guide-card border-l-4 border-l-yellow-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded-md">
                STEP 02
              </span>
              <span className="text-xl">🤖</span>
            </div>
            <h3 className="text-sm font-black text-neutral-900 mb-1">AI 실시간 리서치</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Perplexity & OpenAI가 웹 뉴스와 트렌드를 심층 분석하여 완성형 리포트를 만듭니다.
            </p>
          </div>

          <div className="guide-card border-l-4 border-l-blue-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                STEP 03
              </span>
              <span className="text-xl">📣</span>
            </div>
            <h3 className="text-sm font-black text-neutral-900 mb-1">수신자 그룹 매핑</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              본인 카카오톡뿐 아니라 함께 받아볼 사람의 전화번호와 그룹 태그를 관리합니다.
            </p>
          </div>

          <div className="guide-card border-l-4 border-l-emerald-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                STEP 04
              </span>
              <span className="text-xl">📨</span>
            </div>
            <h3 className="text-sm font-black text-neutral-900 mb-1">자동 발송 & 공유</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              예약 시간에 맞춰 카카오톡으로 전송되며, 단체방 공유 링크와 발송 내역을 제공합니다.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. 발송 채널별 기능 매트릭스 표 ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-black text-neutral-900 flex items-center gap-2">
            <span>📊</span>
            <span>발송 채널별 스펙 & 활용 매트릭스</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            상황과 목적에 맞춰 가장 적합한 발송 방식을 선택하여 활용하세요.
          </p>
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl border border-neutral-200 shadow-xs">
          <table className="w-full text-left text-xs text-neutral-700">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-800 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">발송 채널</th>
                <th className="py-3 px-4">연동 요구조건</th>
                <th className="py-3 px-4">발송 대상</th>
                <th className="py-3 px-4">비용 정책</th>
                <th className="py-3 px-4">추천 활용 용도</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {CHANNEL_MATRIX.map((item, idx) => (
                <tr key={idx} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-neutral-900">
                    <div className="space-y-1">
                      <div>{item.channel}</div>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-neutral-600 leading-relaxed min-w-[160px]">{item.authRequirement}</td>
                  <td className="py-3.5 px-4 font-semibold text-neutral-800 whitespace-nowrap">{item.target}</td>
                  <td className="py-3.5 px-4 text-emerald-700 font-bold whitespace-nowrap">{item.cost}</td>
                  <td className="py-3.5 px-4 leading-relaxed text-neutral-600 min-w-[200px]">{item.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 4. 뉴스레터 오픈율 3배 극대화 7대 황금 수칙 ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-black text-neutral-900 flex items-center gap-2">
            <span>💡</span>
            <span>뉴스레터 오픈율과 클릭율을 높이는 7대 황금 수칙</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            카카오톡 사용자들의 읽기 패턴을 분석하여 완성한 실전 노하우입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {SEVEN_RULES.map((rule, idx) => (
            <div key={idx} className="guide-card flex items-start gap-3.5">
              <span className="text-xl font-black text-amber-700 bg-amber-100 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-amber-300">
                {rule.number}
              </span>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-900">{rule.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 shrink-0">
                    {rule.tag}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">{rule.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. 자주 묻는 질문 (FAQ 5종) ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-black text-neutral-900 flex items-center gap-2">
            <span>❓</span>
            <span>자주 묻는 질문 (FAQ)</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            카카오 연동, 수신자 등록, AI 키 관련 주요 질문에 대한 답변입니다.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_LIST.map((faq, idx) => (
            <details
              key={idx}
              className="group bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs transition-all open:ring-1 open:ring-amber-400"
            >
              <summary className="flex items-center justify-between cursor-pointer font-bold text-neutral-900 text-xs sm:text-sm list-none select-none">
                <span className="flex items-center gap-2.5">
                  <span className="text-amber-600 font-black">Q{idx + 1}.</span>
                  <span>{faq.q}</span>
                </span>
                <span className="text-neutral-400 text-xs group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-600 leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── 6. 하단 바로가기 푸터 카드 ── */}
      <section className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-300 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">API 키와 카카오 연동을 완료하셨나요?</h3>
          <p className="text-xs text-neutral-600 mt-1">
            연동이 완료되면 관심 주제를 등록하여 내일부터 매일 아침 카카오톡 리포트를 받아보세요!
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/settings"
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs shadow-md transition-all"
          >
            🔑 API 키 설정하기
          </Link>
          <Link
            href="/topics"
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-900 font-black text-xs border border-amber-500 shadow-xs transition-all"
          >
            📌 관심 주제 등록
          </Link>
        </div>
      </section>
    </div>
  );
}
