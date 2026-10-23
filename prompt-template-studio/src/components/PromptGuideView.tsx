"use client";

import { useState } from "react";
import {
  BookOpen,
  KeyRound,
  FileCode,
  Sparkles,
  Play,
  HardDriveDownload,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Code2,
  Copy,
  Check,
  Zap,
} from "lucide-react";

interface PromptGuideViewProps {
  onGoToLibrary: () => void;
  onOpenApiKey: () => void;
}

export function PromptGuideView({ onGoToLibrary, onOpenApiKey }: PromptGuideViewProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const handleCopyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const PIPELINE_STEPS = [
    {
      step: "01",
      title: "Gemini API 키 1초 연동",
      desc: "Google AI Studio에서 무료로 발급받은 본인 API 키를 좌측 [API키등록]에 등록합니다. 공유 키나 타인 키를 절대 사용하지 않아 안전합니다.",
      badge: "보안 원칙",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: KeyRound,
      iconColor: "text-emerald-600 bg-emerald-50",
    },
    {
      step: "02",
      title: "템플릿 탐색 & {{변수}} 선언",
      desc: "9종 기본 제공 프리셋을 둘러보거나 [새 프롬프트]를 클릭합니다. 바뀔 단어나 문장에 {{role}}, {{topic}} 처럼 중괄호 2개로 변수를 지정합니다.",
      badge: "동적 파싱",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      icon: FileCode,
      iconColor: "text-blue-600 bg-blue-50",
    },
    {
      step: "03",
      title: "AI 3단 스마트 어시스턴트",
      desc: "아이디어가 떠오르지 않을 땐 [AI 제안] 버튼을 누르세요. 제목, 한 줄 설명, 완성형 템플릿 본문을 AI가 맥락에 맞게 자동으로 설계해 줍니다.",
      badge: "스마트 생성",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: Sparkles,
      iconColor: "text-indigo-600 bg-indigo-50",
    },
    {
      step: "04",
      title: "변수 자동 채우기 & 원클릭 실행",
      desc: "프롬프트 카드에서 [실행]을 누르고 [AI 자동 채우기]를 클릭하면 현실적인 예시 입력값이 쏙 채워집니다. [실행하기]로 Gemini 모델의 답변을 즉시 얻습니다.",
      badge: "초고속 실행",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Play,
      iconColor: "text-amber-600 bg-amber-50",
    },
    {
      step: "05",
      title: "JSON 백업 및 기기간 동기화",
      desc: "소중한 나만의 프롬프트 자산을 좌측 [백업 & 동기화] 메뉴를 통해 표준 JSON 파일로 언제든 원클릭 백업하고 다른 PC/브라우저로 안전하게 가져옵니다.",
      badge: "영구 보관",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      icon: HardDriveDownload,
      iconColor: "text-purple-600 bg-purple-50",
    },
  ];

  const TEMPLATE_EXAMPLES = [
    {
      title: "비즈니스 업무 메일 작성기",
      category: "Business",
      code: "당신은 10년 차 비즈니스 커뮤니케이션 전문가입니다. {{recipient}}에게 보낼 {{purpose}}에 관한 정중하고 명확한 비즈니스 이메일을 작성해주세요.\n\n[핵심 조건]\n- 어조: {{tone}}\n- 필수 포함 내용: {{key_points}}\n- 희망 마감 기한: {{deadline}}",
    },
    {
      title: "시니어 클린 코드 리뷰어",
      category: "Coding",
      code: "당신은 {{language}} 수석 소프트웨어 엔지니어입니다. 아래 제공되는 코드의 성능, 보안 취약점, 가독성, 예외 처리 미흡점을 심층 분석해주세요.\n\n[코드 본문]\n{{code_snippet}}\n\n[리뷰 기준]\n- 대상 프레임워크: {{framework}}\n- 중점 개선 목표: {{focus_area}}",
    },
    {
      title: "SNS 인스타/스레드 바이럴 카피",
      category: "Marketing",
      code: "당신은 100만 팔로워를 보유한 SNS 바이럴 콘텐츠 디렉터입니다. {{target_audience}}의 눈길을 사로잡는 강력한 후킹 1줄과 감성 카피를 작성해주세요.\n\n[제품/주제 정보]\n- 주제: {{topic}}\n- 핵심 소구점: {{usp}}\n- 채널: {{platform}} (이모티콘 적극 활용)",
    },
  ];

  const GOLDEN_RULES = [
    {
      rule: "Rule 1",
      title: "명확한 페르소나(Role) 부여",
      desc: "'당신은 10년 차 IT 테크 전문 기자입니다'처럼 구체적인 전문 직무와 경력을 명시하면 답변 전문성이 3배 향상됩니다.",
    },
    {
      rule: "Rule 2",
      title: "명확한 출력 형식(Format) 지정",
      desc: "글머리 기호(Bullet points), 마크다운 표(Table), 3단 구성 등 원하는 출력 형태를 지정하여 불필요한 서론을 없앱니다.",
    },
    {
      rule: "Rule 3",
      title: "구체적 제약 조건(Constraints)",
      desc: "분량 제한(300자 내외), 필수 포함 키워드, 피해야 할 표현 등을 명시하여 재질문 없는 완벽한 결과물을 유도합니다.",
    },
    {
      rule: "Rule 4",
      title: "반복 재사용을 위한 {{변수}}화",
      desc: "매번 바뀌는 주제, 타깃, 언어, 어조는 {{variable}}로 감싸 템플릿화하면 언제든 1초 만에 최적의 프롬프트를 재실행할 수 있습니다.",
    },
  ];

  const FAQS = [
    {
      q: "Google Gemini API 키는 어디서 무료로 발급받나요?",
      a: "Google AI Studio(aistudio.google.com)에 구글 계정으로 로그인하시면 'Get API Key' 메뉴에서 1분 만에 무료로 발급받으실 수 있습니다. 발급받은 키를 좌측 메뉴의 [🔑 API키등록·플랫폼연동]에 등록하시면 바로 실행이 가능합니다.",
    },
    {
      q: "프롬프트 템플릿 하나에 변수를 몇 개까지 넣을 수 있나요?",
      a: "변수 개수에는 제한이 없습니다. 본문에 {{변수명}}을 입력하시는 즉시 시스템이 실시간으로 감지하여 태그 목록을 추출하며, 실행 시 자동으로 해당 변수들의 입력 폼이 생성됩니다.",
    },
    {
      q: "AI 자동 채우기 기능은 어떤 원리로 작동하나요?",
      a: "프롬프트 템플릿의 제목, 설명, 본문 맥락을 종합 분석하여, 선언된 각 변수에 가장 잘 어울리는 실전 예시 데이터(예: 수신인, 주제, 프로그래밍 언어 등)를 Gemini AI가 자동으로 채워주는 스마트 기능입니다.",
    },
    {
      q: "저장된 프롬프트 템플릿은 안전하게 보관되나요?",
      a: "작성하신 프롬프트는 브라우저 로컬 저장소에 안전하게 보관되며, 좌측 [백업 & 동기화] 기능을 통해 언제든 표준 JSON 파일로 다운로드하여 영구 백업하거나 다른 컴퓨터로 이전할 수 있습니다.",
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* 1. 상단 히어로 헤더 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              📖 공식 사용 가이드북
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 font-mono">
              v1.04 최신판
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <Zap size={12} /> Gemini 2.5 Flash 지원
            </span>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              AI 프롬프트 템플릿 스튜디오 완벽 활용 가이드
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-2xl">
              동적 변수(<code className="text-blue-600 font-bold bg-blue-50 px-1 py-0.5 rounded">{"{{변수}}"}</code>) 기반 템플릿 구축부터 AI 3단 어시스턴트, 예시 데이터 자동 채우기, 원클릭 Gemini 실행 및 JSON 영구 백업까지 단계별 핵심 노하우를 안내합니다.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onGoToLibrary}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <span>템플릿 라이브러리로 이동</span>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={onOpenApiKey}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              <KeyRound size={14} className="text-emerald-600" />
              <span>본인 API 키 연동 확인</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. 5단계 핵심 파이프라인 인포그래픽 */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Sparkles size={18} className="text-blue-600" />
            5단계 원클릭 프롬프트 워크플로우
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            키 연동부터 템플릿 설계, AI 자동 채우기 및 즉시 실행까지 물 흐르듯 이어지는 5단계 파이프라인
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {PIPELINE_STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black font-mono text-slate-400">
                      STEP {item.step}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>

                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.iconColor}`}>
                    <Icon size={18} />
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-slate-900 leading-snug">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. {{동적 변수}} 실전 템플릿 치트시트 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-5">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Code2 size={18} className="text-indigo-600" />
            동적 변수 문법 & 실전 템플릿 모범 예시
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            프롬프트 작성 시 반복되는 값들을 중괄호 2개 <code className="font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">{"{{변수명}}"}</code>으로 지정하면 입력 폼이 자동 생성됩니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TEMPLATE_EXAMPLES.map((tpl, idx) => (
            <div
              key={tpl.title}
              className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                    {tpl.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(tpl.code, idx)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="템플릿 복사"
                  >
                    {copiedIndex === idx ? (
                      <Check size={13} className="text-emerald-600" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
                <h4 className="text-xs font-black text-slate-900">
                  {tpl.title}
                </h4>
                <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {tpl.code}
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                복사 후 [새 프롬프트]에 붙여넣어 즉시 활용하세요.
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 프롬프트 엔지니어링 4대 골든 룰 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-5">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <BookOpen size={18} className="text-emerald-600" />
            성공 확률 100% 프롬프트 엔지니어링 4대 골든 룰
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            원하는 답변을 오차 없이 이끌어내는 고품질 프롬프트 설계의 핵심 규칙
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GOLDEN_RULES.map((rule) => (
            <div
              key={rule.rule}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3"
            >
              <span className="px-2 py-1 rounded-lg text-xs font-black bg-blue-600 text-white shrink-0">
                {rule.rule}
              </span>
              <div>
                <h4 className="text-xs font-black text-slate-900 leading-snug">
                  {rule.title}
                </h4>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {rule.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. 자주 묻는 질문 (FAQ) 아코디언 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">
            자주 묻는 질문 (FAQ)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            이용 중 궁금하신 점을 빠르게 해결해 드립니다.
          </p>
        </div>

        <div className="space-y-2.5">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.q}
                className="border border-slate-200 rounded-2xl overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-blue-600 font-mono font-black">Q.</span>
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                    <p className="flex items-start gap-2">
                      <span className="text-emerald-600 font-mono font-black mt-0.5">A.</span>
                      <span>{faq.a}</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. 하단 보안 안내 & 바로가기 CTA */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-400" />
            <h3 className="text-base font-black">
              100% 회원 본인 API 키 연동 원칙
            </h3>
          </div>
          <p className="text-xs text-blue-200 max-w-xl leading-relaxed">
            AIMaster는 사용자의 Gemini API 키를 브라우저 및 안전한 회원 전용 테이블(`user_api_keys`)에 암호화하여 저장하며, 운영자나 타인의 키로 우회 처리하지 않습니다. 무료 할당량 내에서 안심하고 무제한 실행하세요.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToLibrary}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-blue-50 text-blue-900 font-black text-xs shadow-md transition-all shrink-0 cursor-pointer"
        >
          <span>스튜디오 라이브러리 시작하기</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
