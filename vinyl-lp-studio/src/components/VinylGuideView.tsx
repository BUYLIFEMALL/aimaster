"use client";

// 비주얼 사용 매뉴얼 — 바이닐 다크 레트로 콘솔 스타일 (2026-10-17 v1.08 agy 신설)
// 5단계 표준 파이프라인, 바이닐 영상 떡상 4대 골든 팁, 4종 FAQ 아코디언, 개인 API 키 보안 원칙 배너.
import { useState } from "react";
import Link from "next/link";
import {
  Disc,
  Music,
  Palette,
  Gauge,
  Film,
  KeyRound,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

interface VinylGuideViewProps {
  onBackToStudio?: () => void;
  onOpenApiKeyModal?: () => void;
}

export function VinylGuideView({ onBackToStudio, onOpenApiKeyModal }: VinylGuideViewProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const steps = [
    {
      num: 1,
      title: "미디어 타입 & 메타데이터 설정",
      desc: "제작할 미디어(12인치 클래식 바이닐 LP 또는 4.7인치 홀로그램 CD)를 선택하고 앨범명, 아티스트명을 입력합니다.",
      icon: Music,
      badge: "기본 설정",
      color: "from-amber-500 to-orange-500",
      details: [
        "12인치 바이닐 LP: 턴테이블 톤암과 아날로그 그루브 텍스처가 살아있는 빈티지 레코드",
        "4.7인치 CD: 빛의 각도에 따라 반짝이는 홀로그램 반사광과 현대적 감성의 미디어",
        "라벨 텍스트: 음반 중앙 스티커에 앨범 제목과 아티스트명이 정교하게 인쇄됩니다.",
      ],
    },
    {
      num: 2,
      title: "AI 앨범 아트워크 생성 & 업로드",
      desc: "Gemini AI를 활용해 앨범 컨셉에 맞는 아트워크 프롬프트를 자동 추천받고 1:1 고화질 커버를 즉시 생성하거나 직접 업로드합니다.",
      icon: Palette,
      badge: "AI 비주얼 엔진",
      color: "from-orange-500 to-rose-500",
      details: [
        "✨ AI 프롬프트 추천: 음악 장르와 무드를 분석하여 앨범 커버 프롬프트를 한 번의 클릭으로 완성",
        "🎨 Gemini 이미지 생성: Google 최신 이미지 모델로 1:1 정사각 고화질 아트워크를 자동 렌더링",
        "📁 내 이미지 업로드: 소장 중인 앨범 커버, 사진, 일러스트(PNG/JPG)를 드래그 앤 드롭으로 적용",
      ],
    },
    {
      num: 3,
      title: "턴테이블 & RPM 회전 속도 설정",
      desc: "33⅓, 45, 78 RPM 등 아날로그 턴테이블의 회전 속도를 설정하고 실시간 캔버스에서 부드러운 회전을 확인합니다.",
      icon: Gauge,
      badge: "실시간 프리뷰",
      color: "from-amber-600 to-amber-400",
      details: [
        "33⅓ RPM: LP 앨범의 표준 재생 속도 (편안하고 차분한 로우파이/재즈 무드에 적합)",
        "45 RPM: 싱글 바이닐 속도 (생동감 있고 리드미컬한 팝/시티팝 무드에 최적)",
        "턴테이블 톤암 애니메이션: 음악 재생 시 톤암이 디스크 위에 올라가며 실시간 회전 시작",
      ],
    },
    {
      num: 4,
      title: "오디오(BGM) 업로드 & 파형 싱크",
      desc: "LP 영상과 함께 재생될 오디오 파일(MP3/WAV)을 업로드하여 디스크 회전과 완벽하게 싱크되는 음악 영상을 준비합니다.",
      icon: Disc,
      badge: "사운드 결합",
      color: "from-rose-500 to-pink-500",
      details: [
        "MP3 / WAV / OGG 고음질 음원 지원",
        "음악 길이에 맞추어 회전 루프 타이밍이 자동으로 최적화 계산됩니다.",
        "음원이 없어도 1루프 무한 회전 영상으로 단독 내보내기가 가능합니다.",
      ],
    },
    {
      num: 5,
      title: "WebCodecs 기반 60fps MP4/GIF 고속 내보내기",
      desc: "클라이언트 브라우저 GPU 가속(WebCodecs)을 통해 서버 대기 없이 60fps 초고화질 MP4 비디오 또는 무한루프 GIF로 고속 렌더링합니다.",
      icon: Film,
      badge: "GPU 가속 렌더링",
      color: "from-amber-500 to-emerald-500",
      details: [
        "1080p Full HD 60fps 부드러운 회전 애니메이션 비디오(MP4) 즉시 다운로드",
        "웹 배너 및 숏폼 프로모션용 무한루프 GIF 지원",
        "워터마크 없는 깔끔한 마스터 영상 제작",
      ],
    },
  ];

  const tips = [
    {
      title: "1. 레트로 로우파이 & 재즈 BGM 최적 매칭",
      desc: "따뜻한 아날로그 LP 특유의 느낌을 살리려면 Lo-Fi 힙합, 빈티지 재즈, 시티팝 음원과 매칭할 때 시청자의 몰입도가 가장 극대화됩니다.",
      tag: "음원 선곡 팁",
    },
    {
      title: "2. 1:1 정사각 vs 16:9 숏폼 & 롱폼 루프 전략",
      desc: "인스타그램 릴스/쇼츠에는 정사각 LP 회전 영상을 중앙에 배치하고, 유튜브 롱폼에는 감성적인 배경과 함께 1~2시간 연속 루프 영상을 조립하세요.",
      tag: "플랫폼 활용",
    },
    {
      title: "3. 디스크 광택 & 반사광 텍스처 극대화",
      desc: "어두운 배경과 앰버/골드 조명을 매치하면 LP의 비닐 홈(Groove)과 CD의 무지갯빛 홀로그램 반사광이 화면에서 극적으로 돋보입니다.",
      tag: "비주얼 연출",
    },
    {
      title: "4. Suno AI 음악과 결합한 원스톱 파이프라인",
      desc: "AIMaster의 'Suno 음악기획 자동화'에서 생성한 고유 음악을 가져와 이 프로그램에 넣으면 나만의 오리지널 음반 쇼츠가 3분 만에 완성됩니다.",
      tag: "시너지 효과",
    },
  ];

  const faqs = [
    {
      q: "비디오 렌더링 속도가 매우 빠른 이유는 무엇인가요?",
      a: "본 프로그램은 최신 WebCodecs API와 하드웨어 GPU 가속을 활용하여 사용자의 브라우저에서 직접 프레임을 병렬 인코딩합니다. 서버로 대용량 영상을 전송하지 않아 대기 시간 없이 즉시 60fps MP4 비디오를 렌더링합니다.",
    },
    {
      q: "LP와 CD의 시각적 차이점은 무엇인가요?",
      a: "LP(바이닐) 모드는 블랙 비닐 특유의 미세한 동심원 음각 홈(Groove)과 톤암이 함께 렌더링되며, CD 모드는 알루미늄 광택과 각도에 따라 변하는 무지갯빛 홀로그램 반사광 및 투명 허브 링이 정밀하게 캔버스에 구현됩니다.",
    },
    {
      q: "AI 앨범 아트워크 생성 시 어떤 API 키가 사용되나요?",
      a: "AIMaster의 최상위 불변 원칙에 따라 사용자 본인이 직접 등록한 Google Gemini API 키로만 동작합니다. 타인이나 운영자의 공용 키를 사용하지 않으므로 데이터와 비용이 완벽히 격리·보호됩니다.",
    },
    {
      q: "생성된 영상의 상업적 이용 및 유튜브 업로드가 가능한가요?",
      a: "네, 사용자가 업로드한 음원과 본인 API 키로 생성한 아트워크로 렌더링된 MP4 비디오는 유튜브, 릴스, 틱톡 등에 자유롭게 상업적으로 업로드하실 수 있습니다.",
    },
  ];

  return (
    <div className="flex-1 bg-[#0c0d12] text-slate-100 overflow-y-auto">
      {/* 상단 히어로 배너 */}
      <div className="relative border-b border-[#272b3f] bg-gradient-to-b from-[#141620] to-[#0c0d12] px-6 py-12 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>공식 비주얼 가이드북 · {APP_VERSION}</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                LP 턴테이블 & CD 회전 영상 제작 매뉴얼
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
                Gemini AI 앨범 아트워크부터 아날로그 턴테이블 RPM 회전, 고음질 오디오 결합,
                WebCodecs 60fps MP4 비디오 렌더링까지 단계별로 완벽 마스터하세요.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {onBackToStudio ? (
                <button
                  type="button"
                  onClick={onBackToStudio}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-orange-400"
                >
                  <Disc className="h-4 w-4" />
                  <span>스튜디오 바로가기</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <Link
                  href="/"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-orange-400"
                >
                  <Disc className="h-4 w-4" />
                  <span>스튜디오 바로가기</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}

              {onOpenApiKeyModal && (
                <button
                  type="button"
                  onClick={onOpenApiKeyModal}
                  className="flex items-center gap-2 rounded-xl border border-[#272b3f] bg-[#141620] px-4 py-3 text-xs font-bold text-slate-300 transition-all hover:border-amber-500/50 hover:text-white"
                >
                  <KeyRound className="h-4 w-4 text-emerald-400" />
                  <span>Gemini API 키 연동</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-16 px-6 py-12 lg:px-12">
        {/* 회원 본인 API 키 직접 연동 보안 원칙 배너 */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 backdrop-blur-sm">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-emerald-300">
                🔒 회원 본인 API 키 직접 연동 불변 원칙 준수
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                본 프로그램은 운영자나 타인의 공용 API 키로 폴백하지 않으며, 회원님이 직접 연동한
                본인 Google Gemini API 키로만 앨범 아트워크를 생성합니다. 키는 로컬 브라우저와 안전한
                개인 암호화 영역에만 저장되어 완벽한 보안과 비용 격리를 보장합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 5단계 표준 파이프라인 섹션 */}
        <section className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <Sliders className="h-4 w-4" />
              <span>Step-by-Step Pipeline</span>
            </div>
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">
              턴테이블 영상 제작 5단계 표준 파이프라인
            </h2>
            <p className="text-xs text-slate-400">
              초보자도 3분 만에 완성하는 직관적인 회전 애니메이션 제작 워크플로우입니다.
            </p>
          </div>

          <div className="grid gap-5">
            {steps.map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.num}
                  className="rounded-2xl border border-[#272b3f] bg-[#141620] p-6 transition-all hover:border-amber-500/40"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr ${st.color} text-white font-black text-lg shadow-md`}
                    >
                      {st.num}
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-base font-bold text-white">{st.title}</h3>
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                          {st.badge}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{st.desc}</p>

                      <ul className="space-y-1.5 pt-1">
                        {st.details.map((dt, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed"
                          >
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                            <span>{dt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 바이닐 영상 떡상 4대 골든 팁 */}
        <section className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <Sparkles className="h-4 w-4" />
              <span>Pro Video Creator Tips</span>
            </div>
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">
              바이닐 영상 떡상 4대 골든 팁
            </h2>
            <p className="text-xs text-slate-400">
              유튜브, 릴스, 틱톡 알고리즘을 사로잡는 바이럴 연출 노하우입니다.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {tips.map((tp, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[#272b3f] bg-[#141620] p-5 space-y-2.5"
              >
                <div className="inline-block rounded-md bg-[#1b1e2c] border border-[#272b3f] px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  {tp.tag}
                </div>
                <h3 className="text-sm font-bold text-white">{tp.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{tp.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 트러블슈팅 FAQ 아코디언 */}
        <section className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <HelpCircle className="h-4 w-4" />
              <span>Troubleshooting & FAQ</span>
            </div>
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">자주 묻는 질문 (FAQ)</h2>
            <p className="text-xs text-slate-400">
              작업 중 궁금한 점을 빠르게 해결해 드립니다.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#272b3f] bg-[#141620] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between p-4 sm:p-5 text-left transition-colors hover:bg-[#1b1e2c]/50"
                  >
                    <span className="text-xs sm:text-sm font-bold text-white pr-4">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-amber-400" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-[#272b3f] bg-[#0c0d12]/50 p-4 sm:p-5 text-xs text-slate-300 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
