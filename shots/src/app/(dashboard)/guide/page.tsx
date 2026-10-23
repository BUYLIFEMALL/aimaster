"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Play,
  Sparkles,
  BookOpen,
  ArrowRight,
  Flame,
  Wand2,
  Music2,
  Film,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Layers,
  UploadCloud,
  Timer,
  Zap,
} from "lucide-react";

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const PIPELINE_STEPS = [
    {
      step: "01",
      title: "트렌드 & 바이럴 주제 수집",
      desc: "HTTP URL, NewsBlur RSS, Perplexity Sonar 실시간 소셜 트렌드를 통해 조회수 폭발 잠재력이 높은 쇼츠 소재를 수집합니다.",
      icon: <Flame className="w-5 h-5 text-[#ff4e45]" />,
      badge: "Perplexity / RSS",
    },
    {
      step: "02",
      title: "6장면 시나리오 & 훅 작성",
      desc: "초반 3초 시선 집중용 훅(Hook) 문장과 45~55초 분량의 6개 씬 내러티브 대본 초안을 OpenAI GPT-4o가 완벽 기획합니다.",
      icon: <Layers className="w-5 h-5 text-amber-400" />,
      badge: "OpenAI GPT-4o",
    },
    {
      step: "03",
      title: "나노바나나 9:16 비주얼 생성",
      desc: "스마트폰 세로 화면에 최적화된 9:16 비율로 6개 씬의 인물·배경·화풍 일관성을 유지하며 고해상도 이미지를 생성합니다.",
      icon: <Wand2 className="w-5 h-5 text-emerald-400" />,
      badge: "Gemini Nano-Banana",
    },
    {
      step: "04",
      title: "Suno AI BGM & 감성 사운드",
      desc: "쇼츠 주제의 분위기에 딱 맞는 감성 로파이, 트렌디 팝 비트, 시네마틱 BGM을 Suno AI로 자동 작곡하여 긴장감을 극대화합니다.",
      icon: <Music2 className="w-5 h-5 text-sky-400" />,
      badge: "Suno AI Music",
    },
    {
      step: "05",
      title: "영상 만들기 & 업로드",
      desc: "① 브라우저에서 만들기(무료 기본): 본인 OpenAI 키로 장면 내레이션을 만들고 이미지·노란 자막·배경음악과 함께 이 브라우저 안에서 1080×1920 MP4로 합칩니다(영상 1편 음성 약 10원). ② 고급 합성: 본인 JSON2Video 키·ElevenLabs 음성. 완성 영상은 유튜브 쇼츠·인스타 릴스로 바로 올립니다.",
      icon: <UploadCloud className="w-5 h-5 text-purple-400" />,
      badge: "Browser MP4 & YouTube API",
    },
  ];

  const FAQS = [
    {
      q: "JSON2Video 키가 없어도 영상을 만들 수 있나요?",
      a: "네. 영상 편집 화면의 「최종 영상 만들기」에서 ① 브라우저에서 만들기(기본)를 고르면 OpenAI 키 하나로 만들 수 있습니다. 장면마다 내레이션 음성을 만들고(영상 1편 약 10원) 이 브라우저 안에서 MP4로 합쳐 저장하므로 영상 합성 요금이 없습니다. 만드는 동안(1~3분) 탭을 열어 두세요. 완성 영상은 30일 동안 보관된 뒤 자동으로 지워지니, 그 전에 유튜브·인스타에 올리거나 내려받아 두세요.",
    },
    {
      q: "장면을 움직이는 영상으로 만들 수 있나요?",
      a: "네(선택 기능). 스크립트 화면의 장면 카드 아래 「🎬 장면 AI 영상」에서 모델·길이(5·8·10초)를 고르고 [AI 영상 만들기]를 누르면, 선택한 장면 이미지를 첫 화면으로 움직이는 영상을 만듭니다. 「다음 장면과 이어지게」를 켜면 다음 장면 이미지를 끝 화면으로 넣어 자연스럽게 이어집니다. 기본은 본인 Gemini 키(결제 연결 필요, 5초 약 $0.50)이고, 설정에서 Replicate(가장 저렴, 5초 약 $0.18)·fal 키를 등록하면 고를 수 있습니다. 보통 1~5분 걸리고, 완성된 장면은 「브라우저에서 만들기」 때 이미지 대신 영상으로 들어갑니다. 장면 영상은 30일 뒤 자동으로 지워집니다.",
    },
    {
      q: "유튜브 쇼츠 자동화는 어떤 AI 모델들을 사용하나요?",
      a: "트렌드 및 팩트 기반 검색에는 Perplexity Sonar, 스크립트 및 훅 기획에는 OpenAI GPT-4o, 9:16 세로 씬 이미지 생성에는 Gemini Nano-Banana 2.1, 배경음악 작곡에는 Suno AI 모델을 유기적으로 결합하여 최상의 숏폼 퀄리티를 구현합니다.",
    },
    {
      q: "어떤 방식으로 바이럴 쇼츠 주제를 수집하는 것이 가장 효과적인가요?",
      a: "실시간 화제성을 원할 경우 'Perplexity' 검색에 키워드(예: '최신 AI 테크 팁', '직장인 재테크 꿀팁')를 입력하시는 것을 추천하며, 정기적인 전문 채널 운영 시에는 'NewsBlur RSS'를 통해 구독 매체의 새 글을 자동으로 가져오는 것이 유리합니다.",
    },
    {
      q: "API 키는 안전하게 관리되나요?",
      a: "AIMaster의 100% BYOK(Bring Your Own Key) 보안 원칙에 따라 회원의 API 키는 암호화되어 본인 계정에만 저장되며, 생성된 대본과 영상 소스 또한 회원 본인만 열람할 수 있도록 안전하게 격리됩니다.",
    },
    {
      q: "영상의 길이는 어떻게 최적화되나요?",
      a: "유튜브 쇼츠의 최적 알고리즘 유지 시간인 45초~58초 구간에 맞춰 총 6개 씬(각 7~9초)으로 자동 구성되며, 마지막 씬에는 시청자의 재시청 및 구독을 유도하는 콜투액션(CTA)이 포함됩니다.",
    },
    {
      q: "제작된 영상은 인스타그램 릴스나 틱톡에도 업로드할 수 있나요?",
      a: "네, 생성된 영상은 표준 9:16 세로 비율(1080×1920 MP4)로 렌더링되므로 유튜브 쇼츠는 물론 인스타그램 릴스(Reels) 및 틱톡(TikTok) 플랫폼에 별도 가공 없이 그대로 업로드하여 원소스 멀티유즈가 가능합니다.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* 🎬 가이드북 히어로 배너 */}
      <div className="studio-hero">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#ff0000]/15 border border-[#ff0000]/40 text-[#ff4e45] text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-[#ff0000]" />
              YOUTUBE SHORTS MASTER MANUAL
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#f1f1f1] tracking-tight flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#ff0000] flex items-center justify-center shadow-lg shadow-[#ff0000]/40">
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              </span>
              쇼츠 자동화 공식 가이드북
            </h1>
            <p className="text-sm text-[#aaaaaa] max-w-2xl leading-relaxed">
              소재 수집부터 6장면 스토리텔링, 9:16 비주얼, Suno AI 테마곡 생성 및 Full HD 렌더링까지 쇼츠 제작의 모든 노하우를 확인하세요.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/candidates"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff0000] hover:bg-[#cc0000] text-sm font-bold text-white shadow-lg shadow-[#ff0000]/30 transition-all group"
            >
              <span>쇼츠 스튜디오 가기</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* 5단계 제작 파이프라인 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff0000]" />
          <h2 className="text-lg font-bold text-[#f1f1f1]">
            5단계 쇼츠 제작 파이프라인
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {PIPELINE_STEPS.map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-[#272727] bg-[#181818] p-4 flex flex-col justify-between hover:border-[#ff0000]/40 transition-all group shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-[#ff4e45]">{item.step}</span>
                  <span className="p-1.5 rounded-lg bg-[#222222] group-hover:bg-[#2c2c2c] transition-colors">
                    {item.icon}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-[#f1f1f1] mb-1.5 leading-snug">
                  {item.title}
                </h3>
                <p className="text-[11px] text-[#888888] leading-relaxed">
                  {item.desc}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#252525]">
                <span className="inline-block text-[10px] font-semibold text-[#aaaaaa] bg-[#222222] px-2 py-0.5 rounded">
                  {item.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9:16 비주얼 프롬프트 & 떡상 연출 매트릭스 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff0000]" />
          <h2 className="text-lg font-bold text-[#f1f1f1]">
            9:16 세로 씬 구성 및 떡상 연출 공식
          </h2>
        </div>

        <div className="rounded-xl border border-[#272727] bg-[#181818] overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#222222] text-[#aaaaaa] border-b border-[#2e2e2e]">
                <tr>
                  <th className="py-3 px-4 font-semibold">구간</th>
                  <th className="py-3 px-4 font-semibold">재생 시간</th>
                  <th className="py-3 px-4 font-semibold">씬 연출 포인트</th>
                  <th className="py-3 px-4 font-semibold">9:16 비주얼 가이드</th>
                  <th className="py-3 px-4 font-semibold">사운드 템포</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#272727] text-[#cccccc]">
                <tr className="hover:bg-[#1f1f1f]">
                  <td className="py-3 px-4 font-bold text-[#ff4e45]">오프닝 훅</td>
                  <td className="py-3 px-4 text-[#888888]">0초 ~ 3초</td>
                  <td className="py-3 px-4">스크롤 멈춤용 질문 및 충격적인 핵심 요약</td>
                  <td className="py-3 px-4">초근접 클로즈업, 강렬한 대비 조명, 역동적 포즈</td>
                  <td className="py-3 px-4 text-emerald-400 font-medium">강렬한 비트 드롭</td>
                </tr>
                <tr className="hover:bg-[#1f1f1f]">
                  <td className="py-3 px-4 font-bold text-[#f1f1f1]">문제 제기</td>
                  <td className="py-3 px-4 text-[#888888]">3초 ~ 15초</td>
                  <td className="py-3 px-4">시청자가 겪는 현실적 고통과 공감대 형성</td>
                  <td className="py-3 px-4">고민하는 인물 앵글, 어두운 톤, 차분한 시네마틱</td>
                  <td className="py-3 px-4 text-amber-400 font-medium">긴장감 빌드업</td>
                </tr>
                <tr className="hover:bg-[#1f1f1f]">
                  <td className="py-3 px-4 font-bold text-[#f1f1f1]">핵심 해법 1·2</td>
                  <td className="py-3 px-4 text-[#888888]">15초 ~ 38초</td>
                  <td className="py-3 px-4">실행 가능한 구체적 비법 2가지 빠른 제시</td>
                  <td className="py-3 px-4">밝아지는 톤, 직관적 오브젝트 강조, 세로 분할 구도</td>
                  <td className="py-3 px-4 text-sky-400 font-medium">경쾌한 팝 템포</td>
                </tr>
                <tr className="hover:bg-[#1f1f1f]">
                  <td className="py-3 px-4 font-bold text-amber-400">반전 클라이맥스</td>
                  <td className="py-3 px-4 text-[#888888]">38초 ~ 48초</td>
                  <td className="py-3 px-4">대부분이 모르는 결정적 한 방의 반전 팁</td>
                  <td className="py-3 px-4">하이라이트 네온 효과, 감탄하는 표정, 와이드 앵글</td>
                  <td className="py-3 px-4 text-purple-400 font-medium">절정 하이라이트</td>
                </tr>
                <tr className="hover:bg-[#1f1f1f]">
                  <td className="py-3 px-4 font-bold text-emerald-400">CTA 엔딩</td>
                  <td className="py-3 px-4 text-[#888888]">48초 ~ 58초</td>
                  <td className="py-3 px-4">구독·저장 유도 및 루프 재생(Loop) 완벽 연결</td>
                  <td className="py-3 px-4">정면 시선 응시, 구독 유도 제스처, 오프닝과 연결 구도</td>
                  <td className="py-3 px-4 text-neutral-400 font-medium">자연스러운 페이드</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3대 오디오 & 렌더링 팁 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#272727] bg-[#181818] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#f1f1f1]">
            <Timer className="w-4 h-4 text-[#ff4e45]" />
            <span>0초 훅 비트 드롭</span>
          </div>
          <p className="text-xs text-[#888888] leading-relaxed">
            쇼츠는 첫 1초 안에 청각적 자극이 없으면 이탈합니다. 도입부 무음을 완전히 제거하고 첫 비트가 영상 시작과 0ms에 정확히 일치되도록 믹싱합니다.
          </p>
        </div>

        <div className="rounded-xl border border-[#272727] bg-[#181818] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#f1f1f1]">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>1.8초 컷 전환 리듬</span>
          </div>
          <p className="text-xs text-[#888888] leading-relaxed">
            시청자의 시각적 지루함을 방지하기 위해 씬 내에서도 줌인, 줌아웃, 팬(Pan) 효과를 1.8초 주기로 적용하여 완벽한 시청 지속 시간을 달성합니다.
          </p>
        </div>

        <div className="rounded-xl border border-[#272727] bg-[#181818] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#f1f1f1]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>고대비 볼드 자막 바</span>
          </div>
          <p className="text-xs text-[#888888] leading-relaxed">
            무음 시청자(지하철, 사무실)를 위해 중앙 하단 20% 안전 구역(Safe Zone)에 노란색 포인트 강조 볼드 자막을 자동으로 렌더링합니다.
          </p>
        </div>
      </section>

      {/* 100% BYOK 보안 원칙 배너 */}
      <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-5 flex items-start gap-4">
        <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-emerald-300">
            100% 회원 본인 API 키(BYOK) 및 데이터 보안 보장
          </h3>
          <p className="text-xs text-emerald-200/80 leading-relaxed">
            AIMaster 쇼츠 자동화는 회원이 직접 등록한 OpenAI, Perplexity, Suno AI 및 YouTube API 키로만 동작합니다.
            생성된 모든 쇼츠 스크립트와 영상 에셋은 회원 개인 계정에 안전하게 격리 보관되며 타인과 공유되지 않습니다.
          </p>
        </div>
      </div>

      {/* 자주 묻는 질문 FAQ (아코디언) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#ff4e45]" />
          <h2 className="text-lg font-bold text-[#f1f1f1]">자주 묻는 질문 (FAQ)</h2>
        </div>

        <div className="space-y-2.5">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-[#272727] bg-[#181818] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-[#f1f1f1] hover:text-[#ff4e45] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[#ff0000] font-black">Q{idx + 1}.</span>
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#ff4e45]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#717171]" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-[#aaaaaa] leading-relaxed border-t border-[#252525]/80 bg-[#141414]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
