"use client";

import { useState } from "react";
import {
  BookOpen,
  Sparkles,
  KeyRound,
  Layers,
  Wand2,
  Cpu,
  Copy,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Zap,
  Target,
  Workflow,
  Code2,
  Brain,
  MessageSquare,
} from "lucide-react";

interface PromptGuideViewProps {
  onGoToStudio?: () => void;
  onOpenApiKey?: () => void;
}

const PIPELINE_STEPS = [
  {
    step: "01",
    title: "Gemini API 키 1초 연동",
    subtitle: "초고속 생성 인프라",
    desc: "Google AI Studio에서 무료로 발급받은 본인의 Gemini API 키를 1회 등록합니다. 계정 DB에 안전하게 암호화 보관되며 즉시 활성화됩니다.",
    icon: KeyRound,
    color: "from-emerald-500 to-teal-600",
    badge: "무료 발급",
    tip: "운영자 키 폴백 없는 회원 독립 연동 원칙",
  },
  {
    step: "02",
    title: "5대 프로 모드 & 프리셋 선택",
    subtitle: "업무 맞춤형 프레임워크",
    desc: "RTSC, CoT(사고 사슬), Few-Shot, 페르소나, 동적 변수 중 목적에 맞는 모드를 고르고, 50종의 실전 검증 프리셋을 원클릭으로 불러옵니다.",
    icon: Layers,
    color: "from-violet-500 to-purple-600",
    badge: "50종 프리셋",
    tip: "초보자는 RTSC 기본 모드 권장",
  },
  {
    step: "03",
    title: "실시간 AI 3단 스마트 어시스턴트",
    subtitle: "정밀 프롬프트 빌더",
    desc: "단순한 아이디어만 입력해도 Gemini 2.5 Flash가 전문적인 Role(역할), Task(목표 과업), Structure(출력 구조)를 실시간으로 자동 추천합니다.",
    icon: Wand2,
    color: "from-blue-500 to-indigo-600",
    badge: "AI 실시간 추천",
    tip: "각 필드 옆 'AI 추천' 버튼 클릭 시 3초 완성",
  },
  {
    step: "04",
    title: "메타 프롬프트 원클릭 생성 & 검수",
    subtitle: "고난도 엔지니어링 집약",
    desc: "2026년 최신 기준 연도와 환각 방지 제약, 단계별 사고 체인이 완벽하게 결합된 엔터프라이즈급 실행 프롬프트가 순식간에 조합됩니다.",
    icon: Cpu,
    color: "from-amber-500 to-orange-600",
    badge: "초고속 1~2초",
    tip: "출력 포맷 및 예외 케이스 자동 가드레일 탑재",
  },
  {
    step: "05",
    title: "클립보드 복사 & 실전 AI 실행",
    subtitle: "원클릭 실전 배포",
    desc: "원클릭으로 완성된 프롬프트를 복사하여 ChatGPT, Claude, Gemini 등에 바로 붙여넣습니다. 미흡한 부분은 피드백 재수정으로 즉시 보완 가능합니다.",
    icon: Copy,
    color: "from-fuchsia-500 to-pink-600",
    badge: "멀티 LLM 완벽 호환",
    tip: "Claude, ChatGPT, Gemini 모두 100% 동일 퀄리티",
  },
];

const FRAMEWORK_CHEAT_SHEET = [
  {
    name: "RTSC 모드",
    fullName: "Role-Task-Structure-Chain",
    target: "비즈니스 기획, 보고서, 상세페이지",
    signature: "명확한 역할 부여 + 단계별 수행 + 엄격한 서식 제약",
    icon: Target,
    badgeColor: "bg-violet-100 text-violet-700 border-violet-200",
  },
  {
    name: "CoT 모드",
    fullName: "Chain-of-Thought (사고 사슬)",
    target: "코드 분석, 복잡한 문제 해결, 법률/세무 검토",
    signature: "<thinking> 태그 기반 단계별 논리 전개 유도",
    icon: Brain,
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    name: "Few-Shot 모드",
    fullName: "Few-Shot Exemplar Guided",
    target: "일관된 문체 변환, 데이터 포맷팅, 카피라이팅",
    signature: "정답 예시 2~3개를 주입하여 편차 없는 규격화",
    icon: Code2,
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    name: "Persona 모드",
    fullName: "Deep System Persona",
    target: "고객 상담 챗봇, 심리 분석, 멘토링 에이전트",
    signature: "세계관, 말투, 금기어, 판단 기준을 영구 주입",
    icon: MessageSquare,
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    name: "Dynamic 모드",
    fullName: "Dynamic Variable Slot",
    target: "대량 템플릿 제작, 자동화 파이프라인 연동",
    signature: "{{변수명}} 플레이스홀더를 통한 반복 재사용",
    icon: Workflow,
    badgeColor: "bg-rose-100 text-rose-700 border-rose-200",
  },
];

const FAQ_ITEMS = [
  {
    q: "Google Gemini API 키는 어디서 무료로 발급받나요?",
    a: "Google AI Studio(aistudio.google.com)에 구글 계정으로 로그인한 뒤, 'Get API key' 버튼을 클릭하면 10초 만에 무료 API 키를 발급받을 수 있습니다. 무료 티어로도 하루 수백 회 이상 넉넉하게 사용하실 수 있습니다.",
  },
  {
    q: "생성된 메타 프롬프트는 어떤 AI 모델에서 쓸 수 있나요?",
    a: "생성된 프롬프트는 특정 모델에 종속되지 않는 범용 고성능 프롬프트입니다. ChatGPT(GPT-4o), Claude 3.5 Sonnet, Gemini 2.5 Flash/Pro 등 현존하는 모든 최신 LLM에 그대로 복사하여 붙여넣으시면 최상의 답변을 얻으실 수 있습니다.",
  },
  {
    q: "5대 모드 중 어떤 것을 선택해야 할지 고민됩니다.",
    a: "가장 추천하는 모드는 'RTSC 모드'입니다. 역할, 과업, 출력 구조를 빈틈없이 잡아주어 일반적인 업무, 마케팅, 기획, 글쓰기의 90% 이상을 완벽히 해결합니다. 논리적 추론이나 코드 작성이 목적이라면 'CoT 모드'를, 규격화된 스타일이 필요하다면 'Few-Shot 모드'를 권장합니다.",
  },
  {
    q: "등록한 API 키와 작성한 프롬프트는 안전한가요?",
    a: "네, 완벽히 안전합니다. AIMaster는 '사용자 본인 키 직접 연동 및 회원 데이터 격리 원칙'을 철저히 준수합니다. 등록된 API 키는 암호화되어 오직 본인 요청 시에만 서버 사이드에서 안전하게 호출되며, 다른 회원이나 외부와 절대 공유되지 않습니다.",
  },
];

export function PromptGuideView({ onGoToStudio, onOpenApiKey }: PromptGuideViewProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. 비주얼 히어로 배너 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-900 p-6 md:p-10 text-white shadow-xl">
        <div className="absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 h-48 w-48 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-bold text-violet-300 backdrop-blur-md border border-violet-400/30 mb-4">
            <BookOpen size={13} className="text-violet-300" />
            <span>AI Prompt 자동화 공식 비주얼 가이드북</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight mb-3">
            거친 아이디어를 <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-indigo-200 to-cyan-300">최상위 메타 프롬프트</span>로 완성하는 법
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed font-normal mb-6">
            모호한 질문은 모호한 답변을 낳습니다. 5대 프롬프트 프레임워크와 실시간 AI 3단 어시스턴트를 활용하여,
            ChatGPT · Claude · Gemini가 최고 성능으로 답변할 수밖에 없는 엔터프라이즈급 프롬프트를 1초 만에 빌드하세요.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {onGoToStudio && (
              <button
                type="button"
                onClick={onGoToStudio}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-xs md:text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
              >
                <Sparkles size={16} />
                <span>프롬프트 스튜디오 바로가기</span>
                <ArrowRight size={14} />
              </button>
            )}

            {onOpenApiKey && (
              <button
                type="button"
                onClick={onOpenApiKey}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs md:text-sm font-bold text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer"
              >
                <KeyRound size={15} className="text-emerald-400" />
                <span>Gemini API 키 연동</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. 5단계 파이프라인 인포그래픽 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
              <Zap size={20} className="text-violet-600" />
              <span>5단계 프롬프트 엔지니어링 파이프라인</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              아이디어 기획부터 멀티 LLM 실전 투입까지의 표준 프로세스
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-200">
            Step-by-Step
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {PIPELINE_STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group relative flex flex-col justify-between rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs hover:shadow-md hover:border-violet-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-slate-400 group-hover:text-violet-600 transition-colors">
                      {item.step}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-violet-50 group-hover:text-violet-700 transition-colors">
                      {item.badge}
                    </span>
                  </div>

                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-tr ${item.color} flex items-center justify-center text-white mb-3 shadow-2xs`}>
                    <Icon size={18} />
                  </div>

                  <h3 className="text-sm font-black text-slate-900 leading-snug mb-1">
                    {item.title}
                  </h3>
                  <p className="text-[11px] font-bold text-violet-600 mb-2">
                    {item.subtitle}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 leading-tight">
                    💡 <span className="text-slate-600 font-medium">{item.tip}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 5대 프롬프트 프레임워크 매트릭스 치트시트 */}
      <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
            <Layers size={20} className="text-indigo-600" />
            <span>5대 프롬프트 프레임워크 매트릭스</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            목적에 따라 완벽한 결과를 이끌어내는 검증된 엔지니어링 설계 기법
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold">
                <th className="pb-3 pl-2">프레임워크</th>
                <th className="pb-3">전체 명칭</th>
                <th className="pb-3">최적 활용 분야</th>
                <th className="pb-3 pr-2">시그니처 설계 로직</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {FRAMEWORK_CHEAT_SHEET.map((f, i) => {
                const Icon = f.icon;
                return (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pl-2 font-black text-slate-900 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                        <Icon size={14} />
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${f.badgeColor}`}>
                        {f.name}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono text-slate-600 font-medium">
                      {f.fullName}
                    </td>
                    <td className="py-3.5 text-slate-700 font-medium">
                      {f.target}
                    </td>
                    <td className="py-3.5 pr-2 text-slate-500 font-normal">
                      {f.signature}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. 프로 팁 카드 2종 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50/60 p-5 border border-violet-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-violet-800 font-black text-sm mb-2">
            <Sparkles size={16} className="text-violet-600" />
            <span>프로 팁 1: 역질문 기법 (Reverse Prompting)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            프롬프트 끝부분에 <code className="bg-white px-1.5 py-0.5 rounded text-violet-700 font-bold border border-violet-200">&quot;답변을 작성하기 전, 정보가 부족하다면 나에게 3가지 질문을 먼저 해줘&quot;</code>를 포함하면
            AI가 불확실한 가정을 하지 않고 완벽하게 의도를 파악하여 고품질 결과물을 생성합니다.
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50/60 p-5 border border-indigo-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-indigo-800 font-black text-sm mb-2">
            <CheckCircle2 size={16} className="text-indigo-600" />
            <span>프로 팁 2: 엄격한 출력 서식 제약 (Format Enforcement)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            서론/본론/결론이나 인사말 같은 불필요한 사족을 없애려면 <code className="bg-white px-1.5 py-0.5 rounded text-indigo-700 font-bold border border-indigo-200">&quot;서두나 맺음말 없이 오직 마크다운 테이블(또는 JSON) 블록만 출력해&quot;</code>와
            같은 가드레일을 Structure에 명시하세요.
          </p>
        </div>
      </div>

      {/* 5. 자주 묻는 질문(FAQ) 아코디언 컴포넌트 */}
      <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
            <BookOpen size={20} className="text-violet-600" />
            <span>자주 묻는 질문 (FAQ)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            AI Prompt 스튜디오 사용 중 가장 많이 문의하시는 핵심 질문 모음
          </p>
        </div>

        <div className="space-y-2">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-4 text-left font-bold text-xs md:text-sm text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-black text-violet-700">
                      Q
                    </span>
                    <span>{item.q}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-violet-600" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="p-4 pt-1 text-xs text-slate-600 leading-relaxed bg-slate-50/50 border-t border-slate-100">
                    <div className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-700">
                        A
                      </span>
                      <p className="pt-0.5 font-normal">{item.a}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. 보안 원칙 배너 & 스튜디오 CTA */}
      <div className="rounded-3xl bg-slate-900 p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>회원 본인 API 키 직접 연동 불변 원칙</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                100% 보안 격리
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl font-normal leading-relaxed">
              AIMaster는 운영자나 타인의 키로 대행하지 않으며, 회원 본인의 Google Gemini API 키를 통해 직접 동작합니다.
              생성 데이터는 격리되어 30일 후 자동 파기되며 다른 회원과 절대 공유되지 않습니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
          {onGoToStudio && (
            <button
              type="button"
              onClick={onGoToStudio}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-3 text-xs md:text-sm font-bold text-white shadow-md transition-all cursor-pointer"
            >
              <Sparkles size={16} />
              <span>스튜디오 시작하기</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
