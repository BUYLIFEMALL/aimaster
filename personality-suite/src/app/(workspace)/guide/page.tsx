import Link from "next/link";
import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { ALL_TESTS, GROUPS, testsOf } from "@/lib/tests/registry";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const GOLDEN_RULES = [
  {
    step: "01",
    title: "직관적이고 즉각적인 솔직 응답",
    desc: "너무 오래 생각하지 말고, 질문을 읽었을 때 마음속에 가장 먼저 와닿는 선택지를 즉시 고르는 것이 자신의 고유 성향을 가장 정확하게 드러냅니다.",
  },
  {
    step: "02",
    title: "되고 싶은 나보다 편안한 진짜 나",
    desc: "‘내가 사회적으로 보여주고 싶은 이상적인 모습’이 아니라, 편안한 일상에서 ‘실제로 생각하고 반응하는 나’를 기준으로 답하세요.",
  },
  {
    step: "03",
    title: "맥락에 얽매이지 않고 일반적 상황 상상",
    desc: "최근 겪은 특수한 사건이나 극단적인 스트레스 상황에만 국한하지 말고, 전반적인 나의 평소 패턴을 떠올리며 응답하세요.",
  },
  {
    step: "04",
    title: "경계선(50% 내외) 점수 시 양방향 특성 종합 성찰",
    desc: "지표가 50% 부근인 경우 양쪽 성향을 모두 유연하게 쓰는 성숙한 상태입니다. 한쪽 성향에 갇히지 말고 두 해설을 함께 읽어보세요.",
  },
  {
    step: "05",
    title: "2종 이상 검사 완료로 AI 융합 프로필 해금",
    desc: "단일 검사만으로는 입체적 나를 보기 어렵습니다. 2종 이상의 검사를 완료하면 [종합 프로필]에서 교차 융합 해석을 받을 수 있습니다.",
  },
  {
    step: "06",
    title: "Gemini API 키 사전 연동으로 심층 피드백",
    desc: "회원 본인의 Gemini 키를 등록하면, 일반 검사 결과 요약을 넘어 내 성향의 상관관계와 잠재력까지 분석하는 AI 심층 리포트가 제공됩니다.",
  },
  {
    step: "07",
    title: "분기별(3~6개월) 주기적 재검사 추적",
    desc: "직무 환경, 대인관계, 인생 주기에 따라 성격 표현 방식은 변화합니다. 분기별로 재검사하여 [내 결과]의 시계열 변화 그래프를 확인하세요.",
  },
];

const FAQ_ITEMS = [
  {
    q: "여러 검사를 진행하면 [종합 프로필]에서 어떻게 융합되나요?",
    a: "종합 프로필은 완료한 각 검사의 지표(외향/내향, 사고/감정, 스트레스 지수 등)를 가중치 기반으로 종합하여 단일한 레이더 차트와 다차원 성향 요약 매트릭스를 생성합니다. 또한 회원 본인의 Gemini AI 키를 연동하면 검사 간 상호작용과 잠재적 시너지를 다각도로 입체 분석한 AI 리포트를 제공합니다.",
  },
  {
    q: "AI 심층 분석과 종합 프로필에는 왜 별도의 API 키가 필요한가요?",
    a: "AIMaster의 최상위 불변 원칙에 따라, AI 연동 서비스는 운영자나 타인의 키로 대리 처리되지 않으며 회원 본인 소유의 Google Gemini API 키(무료 티어 지원)로만 안전하게 구동됩니다. 일반 검사 및 기본 해석은 API 키 없이도 100% 무료로 즉시 이용 가능합니다.",
  },
  {
    q: "마음 상태(스트레스·우울감 등) 점검 결과는 왜 자동 저장되지 않나요?",
    a: "심리 및 마음 건강 데이터는 개인의 가장 민감한 프라이버시 정보이므로, 검사 즉시 화면에만 표시되고 서버 DB에는 기본적으로 자동 저장되지 않습니다. 회원이 직접 [내 기록에 저장]을 눌렀을 때만 본인 계정에 암호화 보관되며, AI 분석 데이터로 외부 전송되지 않습니다.",
  },
  {
    q: "과거에 진행했던 이전 검사 결과와 비교해 볼 수 있나요?",
    a: "네, 동일한 검사를 2회 이상 완료하시면 결과 화면 상단에 '지난 결과와 비교' 배너가 자동으로 활성화됩니다. 이전 수치 대비 각 지표가 어떻게 변화했는지 한눈에 비교할 수 있어 자기 성찰에 큰 도움이 됩니다.",
  },
  {
    q: "결과 리포트를 인쇄하거나 PDF로 저장할 수 있나요?",
    a: "결과 화면에서 브라우저 인쇄 단축키(Ctrl+P 또는 Cmd+P)를 누르시면, 불필요한 사이드바와 버튼이 자동으로 숨겨지고 깔끔한 A4 용지 규격의 '성격 진단 공식 리포트' 형태로 즉시 인쇄 및 PDF 저장이 가능하도록 전용 프린트 스타일시트가 적용되어 있습니다.",
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-8 pb-12">
      {/* 1. 가이드북 아틀리에 히어로 */}
      <section className="atelier-hero relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/85 border border-rose-200/80 shadow-sm mb-3">
          <span className="text-sm">📖</span>
          <span className="text-xs font-bold text-rose-800">
            공식 연동 & 사용 가이드북
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight mb-2">
          AI 종합 성격 진단 완벽 활용 매뉴얼
        </h1>
        <p className="text-neutral-600 text-xs sm:text-sm max-w-2xl leading-relaxed">
          검사는 키 없이 즉시 무료로 참여할 수 있으며, 2종 이상의 검사 융합 분석과<br className="hidden sm:inline" />
          AI 심층 입체 프로필 생성을 위한 모든 안내와 황금 수칙을 확인하세요.
        </p>

        <div className="mt-5 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition-all shadow-sm"
          >
            🧭 검사하기로 이동
          </Link>
          <Link
            href="/settings"
            className="px-4 py-2.5 rounded-xl bg-white text-neutral-700 font-bold text-xs border border-neutral-200 hover:bg-neutral-50 transition-all"
          >
            🔑 Gemini 키 설정
          </Link>
        </div>
      </section>

      {/* 2. 4단계 종합 진단 & 융합 파이프라인 다이어그램 */}
      <section className="bg-white rounded-2xl border border-[#f1ebe1] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              4단계 진단 & 융합 워크플로우
            </h2>
            <p className="text-xs text-neutral-500">
              상황별 세부 진단부터 전체 지표를 꿰뚫는 AI 종합 프로필까지의 흐름
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 pt-2">
          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-extrabold text-rose-600 tracking-wider">STEP 01</div>
              <h3 className="text-sm font-bold text-neutral-900 mt-1 mb-1">검사 선택</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                상황별 16유형, 대인관계 소통, 마음 점검 중 원하는 검사를 선택합니다.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-rose-700/80 font-medium">📋 총 {ALL_TESTS.length}종 스위트</div>
          </div>

          <div className="p-4 rounded-xl bg-violet-50/60 border border-violet-100 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-extrabold text-violet-600 tracking-wider">STEP 02</div>
              <h3 className="text-sm font-bold text-neutral-900 mt-1 mb-1">5단계 직관 응답</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                키보드 숫자키(1~5) 또는 터치로 직관적인 응답을 빠르게 진행합니다.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-violet-700/80 font-medium">⚡ 약 2~5분 소요</div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-extrabold text-amber-600 tracking-wider">STEP 03</div>
              <h3 className="text-sm font-bold text-neutral-900 mt-1 mb-1">즉시 결과 & 해석</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                강점, 주의점, 활용 팁이 즉시 도출되며 [내 결과]에 안전하게 보관됩니다.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-amber-700/80 font-medium">📊 지난 결과와 비교</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-extrabold text-emerald-600 tracking-wider">STEP 04</div>
              <h3 className="text-sm font-bold text-neutral-900 mt-1 mb-1">AI 융합 프로필</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                2종 이상 검사를 완료하면 다중 검사를 결합한 AI 심층 입체 프로필을 받습니다.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-emerald-700/80 font-medium">🔮 입체 상관관계 리포트</div>
          </div>
        </div>
      </section>

      {/* 3. 지원 검사군 매트릭스 표 */}
      <section className="bg-white rounded-2xl border border-[#f1ebe1] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📑</span>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                지원 검사군 매트릭스 도감
              </h2>
              <p className="text-xs text-neutral-500">
                각 검사군별 측정 목적, 문항 수 및 AI 심층 분석 지원 현황
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-neutral-400">총 {ALL_TESTS.length}개 검사</span>
        </div>

        <div className="overflow-x-auto">
          <table className="atelier-matrix-table">
            <thead>
              <tr>
                <th className="w-28">카테고리</th>
                <th className="w-48">검사명</th>
                <th className="w-20 text-center">문항수</th>
                <th>측정 목적 및 특징</th>
                <th className="w-24 text-center">AI 분석</th>
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((group) => {
                const tests = testsOf(group.id);
                return tests.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-rose-50/20 transition-colors">
                    {idx === 0 && (
                      <td
                        rowSpan={tests.length}
                        className="font-bold text-xs text-rose-700 bg-[#faf6f0]/50 align-top pt-3 border-r border-[#f1ebe1]"
                      >
                        {group.label}
                      </td>
                    )}
                    <td className="font-bold text-xs text-neutral-900">
                      {t.title}
                    </td>
                    <td className="text-center font-mono text-xs text-neutral-600">
                      {t.questions.length}문항
                    </td>
                    <td className="text-xs text-neutral-600">
                      {t.tagline}
                    </td>
                    <td className="text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        지원
                      </span>
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. 정확한 자기 이해 7대 황금 수칙 */}
      <section className="bg-white rounded-2xl border border-[#f1ebe1] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              정확한 자기 이해와 진단 신뢰도 극대화 7대 황금 수칙
            </h2>
            <p className="text-xs text-neutral-500">
              가장 왜곡 없는 솔직한 나를 발견하기 위한 핵심 가이드
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {GOLDEN_RULES.map((rule) => (
            <div key={rule.step} className="rule-card-atelier flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-100 to-indigo-100 text-rose-700 font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                {rule.step}
              </span>
              <div>
                <h3 className="text-xs font-bold text-neutral-900 mb-0.5">
                  {rule.title}
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {rule.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Gemini API 키 연동 안내 */}
      <section className="bg-white rounded-2xl border border-[#f1ebe1] p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔑</span>
          <h2 className="text-base font-bold text-neutral-900">
            Gemini API 키 등록 안내 (AI 심층 분석 & 종합 프로필용)
          </h2>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed">
          AI 심층 분석과 종합 프로필은 <strong>회원님 본인의 Google Gemini API 키</strong>로 동작합니다.
          운영자나 다른 회원의 키로 대신 처리되지 않으며, 한 번 등록해 두면 안전하게 암호화 보관되어 모든 분석 기능을 자유롭게 이용할 수 있습니다.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/settings"
            className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-all"
          >
            🔑 API키등록·플랫폼연동으로 이동
          </Link>
          {GEMINI_GUIDE_URL && (
            <GuideLinkButton url={GEMINI_GUIDE_URL} label="📖 Gemini 키 발급 상세 매뉴얼 (새 창)" />
          )}
        </div>
      </section>

      {/* 6. 실무 FAQ 5종 아코디언 */}
      <section className="bg-white rounded-2xl border border-[#f1ebe1] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">❓</span>
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              자주 묻는 질문 (FAQ)
            </h2>
            <p className="text-xs text-neutral-500">
              회원님들이 가장 자주 문의하시는 질문과 답변입니다.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {FAQ_ITEMS.map((item, idx) => (
            <details
              key={idx}
              className="faq-atelier group p-4 border border-neutral-200/80 rounded-xl [&_summary::-webkit-details-marker]:none"
            >
              <summary className="flex items-center justify-between cursor-pointer font-bold text-xs sm:text-sm text-neutral-800 group-open:text-rose-600 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-rose-500 font-black">Q.</span>
                  <span>{item.q}</span>
                </div>
                <span className="text-neutral-400 group-open:rotate-180 transition-transform text-xs">
                  ▼
                </span>
              </summary>
              <p className="mt-3 text-xs text-neutral-600 leading-relaxed pl-6 border-l-2 border-rose-200">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
