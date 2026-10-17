"use client";

import { useState } from "react";
import {
  BookOpen,
  Sparkles,
  KeyRound,
  Music,
  Image as ImageIcon,
  Sliders,
  Film,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Zap,
  Play,
  Flame,
  Clock,
  Layers,
  Radio,
  FileCheck2,
} from "lucide-react";

interface PlaylistGuideViewProps {
  onGoToStudio?: () => void;
  onOpenApiKey?: () => void;
}

const PIPELINE_STEPS = [
  {
    step: "01",
    title: "Gemini API 키 1초 연동",
    subtitle: "AI 감성 배경 인프라",
    desc: "Google AI Studio에서 무료 발급받은 Gemini API 키를 연동합니다. 16:9 유튜브 감성 배경 이미지를 즉시 생성할 수 있습니다.",
    icon: KeyRound,
    color: "from-red-600 to-rose-700",
    badge: "무료 연동",
    tip: "운영자 키 폴백 없는 회원 독립 연동 원칙",
  },
  {
    step: "02",
    title: "음원 업로드 & 유튜브 챕터 자동 복사",
    subtitle: "스마트 타임라인 생성",
    desc: "MP3, WAV 음원들을 드롭존에 넣으면 누적 재생시간을 실시간 연산하여 '00:00 곡명' 유튜브 설명란 챕터 텍스트를 원클릭 복사합니다.",
    icon: Music,
    color: "from-amber-600 to-red-600",
    badge: "타임라인 자동화",
    tip: "유튜브 영상 설명란에 바로 붙여넣기 가능",
  },
  {
    step: "03",
    title: "16:9 배경 & 1:1 채널 로고 등록",
    subtitle: "고화질 비주얼 세팅",
    desc: "16:10 황금비 배경 미디어(이미지/비디오)를 업로드하거나 AI로 생성하고, 1:1 정사각형 채널 로고와 GIF 애니메이션 스티커를 배치합니다.",
    icon: ImageIcon,
    color: "from-red-700 to-red-500",
    badge: "16:9 & 1:1 비율",
    tip: "개별 삭제(휴지통) 및 실시간 교체 완비",
  },
  {
    step: "04",
    title: "10종 스펙트럼 & 14종 파티클 커스텀",
    subtitle: "실시간 비트 반응 FX",
    desc: "대칭 막대, 서클, 웨이브폼 등 10종 오디오 스펙트럼과 물방울, 네온, 눈, 비 등 14종 파티클 효과, 8종 필터를 16:9 캔버스에서 실시간 튜닝합니다.",
    icon: Sliders,
    color: "from-rose-600 to-pink-600",
    badge: "10종 EQ & 14종 FX",
    tip: "스페이스바로 실시간 재생/정지 프리뷰",
  },
  {
    step: "05",
    title: "WebCodecs GPU 1080p 고속 인코딩",
    subtitle: "오디오+비디오 완전체 출력",
    desc: "브라우저 GPU 하드웨어 가속(VideoEncoder)과 48kHz 스테레오 오디오 인코딩(AudioEncoder)으로 1080p MP4를 순식간에 내보냅니다.",
    icon: Film,
    color: "from-red-600 to-red-800",
    badge: "초고속 무음 해결",
    tip: "v1.05 오디오 엔진 탑재로 완벽한 사운드 보장",
  },
];

const GOLDEN_TIPS = [
  {
    title: "골든 팁 1: 첫 곡 30초 훅 & 타임라인 필수 기재",
    desc: "시청자의 70%는 첫 곡의 도입부 30초에서 이탈 여부를 결정합니다. 가장 대중적이고 매력적인 트랙을 1번에 배치하고, 설명란에 복사한 유튜브 타임라인 챕터를 반드시 기재하세요.",
    icon: Flame,
    color: "border-red-500/40 bg-red-950/20 text-red-400",
  },
  {
    title: "골든 팁 2: 배경 무드와 오디오 스펙트럼 색상 일치",
    desc: "배경 이미지의 핵심 톤(예: 비 오는 밤 ➔ 딥 블루, 로파이 카페 ➔ 웜 앰버)과 오디오 스펙트럼의 그라디언트 컬러를 통일하면 시청자의 시각적 몰입감이 200% 극대화됩니다.",
    icon: Radio,
    color: "border-amber-500/40 bg-amber-950/20 text-amber-400",
  },
  {
    title: "골든 팁 3: 과도하지 않은 감성 파티클 레이어링",
    desc: "파티클 개수를 너무 많이 늘리면 음악 감상에 방해가 될 수 있습니다. '비'나 '빛망울' 등 음악 장르와 어울리는 1~2개 파티클을 30~50% 투명도로 은은하게 얹는 것이 정석입니다.",
    icon: Sparkles,
    color: "border-rose-500/40 bg-rose-950/20 text-rose-400",
  },
  {
    title: "골든 팁 4: 디스크 직접 쓰기(File Picker) 활용",
    desc: "수십 곡이 들어간 1~2시간 분량의 플레이리스트는 메모리 용량이 매우 큽니다. 크롬/엣지의 '디스크 직접 저장' 모드를 활용하면 메모리 부족(OOM) 없이 안정적으로 렌더링됩니다.",
    icon: FileCheck2,
    color: "border-emerald-500/40 bg-emerald-950/20 text-emerald-400",
  },
];

const FAQ_ITEMS = [
  {
    q: "MP4 렌더링 후 소리가 안 나오는 문제는 해결되었나요?",
    a: "네, 완벽히 해결되었습니다! v1.05 오디오 엔진 패치를 통해 브라우저 WebCodecs AudioEncoder가 48kHz 스테레오 AudioData 청크를 0.5초 단위로 끊김 없이 비디오 트랙과 결합하여, 다운로드한 MP4 파일에 원본 그대로의 풍부한 사운드가 완벽히 저장됩니다.",
  },
  {
    q: "유튜브에 업로드했을 때 저작권 및 수익 창출은 어떻게 되나요?",
    a: "업로드하시는 음원의 저작권 보유 여부에 따라 결정됩니다. 본인이 작곡한 음악(Suno/Udio 등 AI 음악 포함)이나 No Copyright 음원은 100% 본인 채널 수익 창출이 가능하며, 저작권이 있는 상용 음원은 유튜브 Content ID에 의해 원작자에게 광고 수익이 배분될 수 있습니다.",
  },
  {
    q: "16:9 감성 배경을 AI로 생성할 때 비용이 드나요?",
    a: "Google AI Studio에서 발급받은 본인의 Gemini API 키를 연동하시면, 무료 티어 한도 내에서 감성 배경 이미지를 추가 비용 없이 생성하실 수 있습니다. 본인 키로 직접 서버와 통신하므로 플랫폼 공용 키 폴백이나 숨겨진 과금이 없습니다.",
  },
  {
    q: "인코딩 속도가 다른 웹 툴보다 훨씬 빠른 이유는 무엇인가요?",
    a: "서버로 음원과 영상을 업로드하여 변환하는 구형 방식과 달리, 사용자의 PC 그래픽 카드(GPU) 하드웨어 가속(WebCodecs API)을 브라우저에서 직접 활용하기 때문입니다. 대용량 영상도 서버 대기 시간 없이 초고속으로 인코딩됩니다.",
  },
];

export function PlaylistGuideView({ onGoToStudio, onOpenApiKey }: PlaylistGuideViewProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="space-y-8 pb-16">
      <section className="rounded-2xl border border-[#303030] bg-[#181818] p-5 text-[#f1f1f1]">
        <h2 className="font-bold">🔎 Viral Finder에서 참고 영상 가져오기</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#aaaaaa]">Viral Finder의 영상 카드에서 「Playlist 참고 메모 복사」를 누른 다음, 이 프로그램의 미디어 센터 참고 메모 칸에 붙여넣고 불러오세요. 같은 계정에서 5분 안에 제목과 주소를 확인할 수 있습니다. 메뉴 이동·새로고침 뒤에는 메모가 사라집니다. 실제 영상·음원을 내려받거나 AI를 자동 실행하지 않습니다.</p>
      </section>
      {/* 1. 유튜브 공식 다크 히어로 배너 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a0505] via-[#140808] to-[#0f0f0f] p-6 md:p-10 text-white border border-[#272727] shadow-2xl">
        <div className="absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-[#ff0000]/15 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 h-48 w-48 rounded-full bg-red-600/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          {/* 유튜브 공식 플레이 로고 뱃지 */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#272727]/90 px-3.5 py-1 text-xs font-bold text-white backdrop-blur-md border border-[#3f3f3f] mb-4">
            <div className="flex h-4 w-5 items-center justify-center rounded bg-[#ff0000] text-white">
              <Play size={10} fill="currentColor" />
            </div>
            <span>YouTube Playlist Studio 공식 비주얼 가이드북</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight mb-3">
            클릭 몇 번으로 완성하는 <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff0000] via-red-400 to-rose-300">유튜브 1080p 플레이리스트 영상</span>
          </h1>

          <p className="text-sm md:text-base text-[#aaaaaa] leading-relaxed font-normal mb-6">
            음원 드롭존 하나로 누적 재생시간 챕터 타임라인 자동 생성, 16:9 감성 배경 & 1:1 채널 로고 배치,
            10종 오디오 스펙트럼과 14종 파티클 FX 튜닝, 그리고 WebCodecs GPU 가속 1080p MP4 고속 인코딩까지
            원스톱으로 완성하세요.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {onGoToStudio && (
              <button
                type="button"
                onClick={onGoToStudio}
                className="inline-flex items-center gap-2 rounded-xl bg-[#ff0000] hover:bg-[#cc0000] px-5 py-2.5 text-xs md:text-sm font-bold text-white shadow-lg shadow-red-900/30 transition-all cursor-pointer"
              >
                <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-white text-[#ff0000]">
                  <Play size={10} fill="currentColor" />
                </div>
                <span>스튜디오 바로가기</span>
                <ArrowRight size={14} />
              </button>
            )}

            {onOpenApiKey && (
              <button
                type="button"
                onClick={onOpenApiKey}
                className="inline-flex items-center gap-2 rounded-xl bg-[#212121] hover:bg-[#272727] px-4 py-2.5 text-xs md:text-sm font-bold text-white border border-[#333333] transition-all cursor-pointer"
              >
                <KeyRound size={15} className="text-[#ff0000]" />
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
            <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
              <Zap size={20} className="text-[#ff0000]" />
              <span>5단계 플레이리스트 영상 제작 파이프라인</span>
            </h2>
            <p className="text-xs text-[#aaaaaa] mt-0.5">
              음원 업로드부터 유튜브 1080p MP4 인코딩까지의 표준 파이프라인
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#ff0000] bg-red-950/40 px-2.5 py-1 rounded-full border border-red-800/40">
            Step-by-Step
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {PIPELINE_STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group relative flex flex-col justify-between rounded-2xl bg-[#181818] p-4 border border-[#272727] hover:border-[#ff0000]/60 transition-all shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-[#666666] group-hover:text-[#ff0000] transition-colors">
                      {item.step}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#212121] text-[#aaaaaa] group-hover:bg-red-950/60 group-hover:text-red-300 transition-colors">
                      {item.badge}
                    </span>
                  </div>

                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-tr ${item.color} flex items-center justify-center text-white mb-3 shadow-md`}>
                    <Icon size={18} />
                  </div>

                  <h3 className="text-sm font-black text-white leading-snug mb-1">
                    {item.title}
                  </h3>
                  <p className="text-[11px] font-bold text-[#ff0000] mb-2">
                    {item.subtitle}
                  </p>
                  <p className="text-xs text-[#aaaaaa] leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#272727]">
                  <p className="text-[10px] text-[#777777] leading-tight">
                    💡 <span className="text-[#cccccc] font-medium">{item.tip}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 유튜브 플레이리스트 떡상 4대 골든 팁 */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
            <Flame size={20} className="text-[#ff0000]" />
            <span>유튜브 플레이리스트 채널 떡상 4대 골든 팁</span>
          </h2>
          <p className="text-xs text-[#aaaaaa] mt-0.5">
            조회수와 시청 지속 시간을 극대화하는 프로 유튜버들의 핵심 연출 공식
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GOLDEN_TIPS.map((tip, i) => {
            const Icon = tip.icon;
            return (
              <div
                key={i}
                className={`rounded-2xl border p-5 transition-all ${tip.color}`}
              >
                <div className="flex items-center gap-2 font-black text-sm mb-2 text-white">
                  <Icon size={18} className="text-[#ff0000]" />
                  <span>{tip.title}</span>
                </div>
                <p className="text-xs text-[#cccccc] leading-relaxed font-normal">
                  {tip.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 자주 묻는 질문(FAQ) 아코디언 컴포넌트 */}
      <div className="rounded-3xl bg-[#181818] p-6 border border-[#272727] shadow-md space-y-4">
        <div>
          <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
            <BookOpen size={20} className="text-[#ff0000]" />
            <span>자주 묻는 질문 (FAQ)</span>
          </h2>
          <p className="text-xs text-[#aaaaaa] mt-0.5">
            유튜브 플레이리스트 제작 중 가장 많이 문의하시는 핵심 질문 모음
          </p>
        </div>

        <div className="space-y-2">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[#272727] bg-[#212121] overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-4 text-left font-bold text-xs md:text-sm text-white hover:bg-[#272727] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-950/60 text-[11px] font-black text-[#ff0000] border border-red-800/40">
                      Q
                    </span>
                    <span>{item.q}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-[#777777] transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#ff0000]" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="p-4 pt-1 text-xs text-[#cccccc] leading-relaxed bg-[#181818] border-t border-[#272727]">
                    <div className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-950/60 text-[11px] font-black text-emerald-400 border border-emerald-800/40">
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

      {/* 5. 회원 본인 API 키 직접 연동 불변 원칙 배너 & 스튜디오 CTA */}
      <div className="rounded-3xl bg-[#140808] p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 border border-red-900/40 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600/20 text-[#ff0000] border border-red-500/30">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>회원 본인 API 키 직접 연동 불변 원칙</span>
              <span className="text-[10px] bg-red-950 text-red-400 px-2 py-0.5 rounded-full font-bold border border-red-800/40">
                100% 보안 격리
              </span>
            </h3>
            <p className="text-xs text-[#aaaaaa] mt-1 max-w-xl font-normal leading-relaxed">
              AIMaster는 운영자나 타인의 키로 대행하지 않으며, 회원 본인의 Google Gemini API 키를 통해 감성 배경을 안전하게 생성합니다.
              생성 데이터는 격리되어 30일 후 자동 파기되며 다른 회원과 절대 공유되지 않습니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
          {onGoToStudio && (
            <button
              type="button"
              onClick={onGoToStudio}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff0000] hover:bg-[#cc0000] px-6 py-3 text-xs md:text-sm font-bold text-white shadow-lg shadow-red-900/40 transition-all cursor-pointer"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-white text-[#ff0000]">
                <Play size={10} fill="currentColor" />
              </div>
              <span>스튜디오 시작하기</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
