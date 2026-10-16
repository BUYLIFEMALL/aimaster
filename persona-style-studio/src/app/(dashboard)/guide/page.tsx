"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  KeyRound,
  SlidersHorizontal,
  Sparkles,
  PenLine,
  HardDriveDownload,
  ChevronDown,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  Zap,
  RotateCcw,
} from "lucide-react";

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const PIPELINE_STEPS = [
    {
      step: "01",
      title: "Gemini API 키 1초 연동",
      desc: "Google AI Studio에서 무료로 발급받은 본인 API 키를 좌측 [🔑 API키등록]에 등록합니다. 운영자나 타인의 키를 절대 사용하지 않아 안전합니다.",
      badge: "보안 원칙",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: KeyRound,
      iconColor: "text-emerald-600 bg-emerald-50",
    },
    {
      step: "02",
      title: "페르소나 선택 & AI 자동 생성",
      desc: "10종 기본 페르소나(수석 카피라이터, IT 칼럼니스트, 감성 수필가 등)를 고르거나, 이름과 역할만 넣고 [AI 자동 생성]으로 나만의 캐릭터를 3초 만에 만듭니다.",
      badge: "캐릭터 문체",
      badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
      icon: UserCheck,
      iconColor: "text-violet-600 bg-violet-50",
    },
    {
      step: "03",
      title: "5단 이퀄라이저 & 프리셋 조절",
      desc: "창의성·명확성·감정 깊이·길이·전문성 5개 슬라이더를 마우스 드래그나 방향키로 미세 조절하거나, 8종 원클릭 프리셋으로 최적의 톤앤매너를 맞춥니다.",
      badge: "정밀 튜닝",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      icon: SlidersHorizontal,
      iconColor: "text-blue-600 bg-blue-50",
    },
    {
      step: "04",
      title: "원문 입력 & 명작 다시쓰기",
      desc: "가운데 캔버스에 최대 8,000자의 원문을 넣고 [명작 생성]을 누르면 Gemini 2.5 Flash가 1~3초 만에 문체를 바꿉니다. 마음에 안 들면 [되돌리기]로 즉시 복원합니다.",
      badge: "초고속 변환",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      icon: PenLine,
      iconColor: "text-amber-600 bg-amber-50",
    },
    {
      step: "05",
      title: "초안 보관 & JSON/TXT 백업",
      desc: "완성된 글은 내 계정에 초안으로 보관되며 .txt 파일로 즉시 내려받을 수 있습니다. 페르소나 설정은 표준 JSON 파일로 안전하게 백업 및 복원 가능합니다.",
      badge: "영구 보관",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      icon: HardDriveDownload,
      iconColor: "text-purple-600 bg-purple-50",
    },
  ];

  const EQ_PARAMETERS = [
    {
      name: "창의성 (Creativity)",
      range: "0 ~ 100",
      desc: "수치가 높을수록 참신한 은유와 독창적인 비유를 적극 활용하며, 낮을수록 정직하고 군더더기 없는 문체로 작성됩니다.",
      tip: "소설, 에세이, 바이럴 카피에는 70~90 권장 / 보고서, 매뉴얼에는 20~40 권장",
    },
    {
      name: "명확성 (Clarity)",
      range: "0 ~ 100",
      desc: "수치가 높을수록 논리적 구조와 두괄식 전달력이 강화되며, 낮을수록 여운과 은은한 문학적 암시가 깊어집니다.",
      tip: "비즈니스, 학술, 정보성 글에는 80~100 권장",
    },
    {
      name: "감정 깊이 (Emotion)",
      range: "0 ~ 100",
      desc: "수치가 높을수록 독자의 마음을 울리는 따뜻하고 열정적인 감성 톤을 띠며, 낮을수록 냉철하고 객관적인 사실 톤을 유지합니다.",
      tip: "감성 글귀, 리뷰, 후기에는 80 이상 권장",
    },
    {
      name: "길이 (Length)",
      range: "0% ~ 200%",
      desc: "원문 대비 완성본의 분량 비율을 제어합니다. 0은 30% 핵심 요약, 50은 원문과 비슷한 분량, 100은 약 200% 상세 해설입니다.",
      tip: "요약본이 필요할 땐 0~30 / 풍성한 스토리텔링은 70~100",
    },
    {
      name: "전문성 (Expertise)",
      range: "0 ~ 100",
      desc: "수치가 높을수록 해당 분야의 전문 용어와 학술적 어휘를 구사하며, 낮을수록 누구나 이해하기 쉬운 친절한 대중적 어조를 사용합니다.",
      tip: "전문 칼럼, 기술 문서에는 80~100 권장",
    },
  ];

  const FAQS = [
    {
      q: "Google Gemini API 키는 어디서 무료로 발급받나요?",
      a: "Google AI Studio(aistudio.google.com)에 로그인하신 후 'Get API Key' 메뉴에서 1분 만에 무료로 발급받으실 수 있습니다. 발급받은 키를 좌측 메뉴의 [🔑 API키등록·플랫폼연동]에 등록하시면 즉시 문체 변환이 활성화됩니다.",
    },
    {
      q: "한 번에 몇 자까지 다시 쓸 수 있나요?",
      a: "글은 한 번에 최대 8,000자까지 변환 가능합니다. 장문의 원고는 문단이나 챕터 단위로 나누어 변환하시면 훨씬 더 섬세하고 정교한 문체 조절이 가능합니다.",
    },
    {
      q: "다시쓴 글이 마음에 들지 않으면 직전 글을 되찾을 수 있나요?",
      a: "네, 생성 완료 후 캔버스 상단에 나타나는 [↩️ 되돌리기] 버튼을 누르시면 변환 직전의 원문 텍스트가 1초 만에 그대로 복원되므로 안심하고 마음껏 실험하실 수 있습니다.",
    },
    {
      q: "내가 직접 만든 커스텀 페르소나는 어디에 저장되나요?",
      a: "회원님의 Supabase DB에 안전하게 암호화 보관되며, 페르소나 패널 하단의 [내보내기] 버튼을 통해 JSON 파일로 내 컴퓨터에 영구 백업하거나 다른 환경으로 이전할 수 있습니다.",
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* 1. 상단 히어로 헤더 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-violet-500/10 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200">
              📖 공식 사용 가이드북
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 font-mono">
              v1.07 최신판
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <Zap size={12} /> Gemini 2.5 Flash 초고속 변환
            </span>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              페르소나 문체 자동화 스튜디오 완벽 활용 가이드
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-2xl">
              10종 기본 페르소나와 AI 맞춤 캐릭터 생성, 5대 문체 이퀄라이저 슬라이더 정밀 튜닝, 원클릭 다시쓰기 및 초안/JSON 영구 백업까지 단계별 핵심 노하우를 안내합니다.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link
              href="/studio"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all"
            >
              <span>집필 스튜디오로 이동</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
            >
              <KeyRound size={14} className="text-emerald-600" />
              <span>본인 API 키 연동 확인</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. 5단계 핵심 파이프라인 인포그래픽 */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Sparkles size={18} className="text-violet-600" />
            5단계 원클릭 문체 변환 워크플로우
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            키 연동부터 캐릭터 선택, 이퀄라이저 조절, 8,000자 다시쓰기 및 영구 보관까지 물 흐르듯 이어지는 5단계 파이프라인
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

      {/* 3. 5대 문체 이퀄라이저 파라미터 매트릭스 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-5">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-violet-600" />
            5대 문체 이퀄라이저 파라미터 매트릭스
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            원하는 감성과 목적에 맞게 슬라이더를 조합하여 나만의 독창적인 글 스타일을 완성하세요.
          </p>
        </div>

        <div className="space-y-3">
          {EQ_PARAMETERS.map((param) => (
            <div
              key={param.name}
              className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="space-y-1 md:max-w-xl">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-900">
                    {param.name}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 font-mono">
                    {param.range}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {param.desc}
                </p>
              </div>

              <div className="text-[11px] font-medium text-slate-500 bg-white px-3 py-2 rounded-xl border border-slate-200/80 shrink-0">
                💡 <span className="text-slate-700 font-bold">{param.tip}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 프로 팁: 스마트 되돌리기 & 파일 내보내기 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-violet-700">
            <RotateCcw size={18} />
            <h3 className="text-sm font-black">원클릭 되돌리기 안심 설계</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            문체 다시쓰기를 실행한 뒤 결과가 마음에 들지 않거나 다른 페르소나로 재시도하고 싶으신가요? 캔버스 상단의 [되돌리기] 버튼을 누르면 직전 원본 글이 1초 만에 복원되므로 안심하고 다양한 캐릭터를 시험해 보실 수 있습니다.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-blue-700">
            <HardDriveDownload size={18} />
            <h3 className="text-sm font-black">초안 계정 저장 & TXT/JSON 다운로드</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            완성된 글은 내 계정 초안 보관함에 즉시 저장되며, 별도의 파일 저장 없이도 언제든 다시 불러올 수 있습니다. 또한 외부에 제출할 수 있도록 .txt 텍스트 파일 저장과 페르소나 설정 JSON 백업을 기본 지원합니다.
          </p>
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
                    <span className="text-violet-600 font-mono font-black">Q.</span>
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-violet-600" : ""
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
      <div className="bg-gradient-to-r from-violet-900 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-400" />
            <h3 className="text-base font-black">
              100% 회원 본인 API 키 직접 연동 원칙
            </h3>
          </div>
          <p className="text-xs text-violet-200 max-w-xl leading-relaxed">
            AIMaster는 회원의 Gemini API 키를 안전한 회원 전용 테이블(`user_api_keys`)에 암호화하여 저장하며, 운영자나 타인의 키로 우회 처리하지 않습니다. 무료 할당량 내에서 안심하고 무제한 문체 변환을 즐겨보세요.
          </p>
        </div>

        <Link
          href="/studio"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-violet-50 text-violet-900 font-black text-xs shadow-md transition-all shrink-0 cursor-pointer"
        >
          <span>집필 스튜디오 시작하기</span>
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
