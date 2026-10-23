"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Layers,
  Heart,
  Briefcase,
  Eye,
  Compass,
  Star,
  Flame,
  Droplet,
  Wind,
  Mountain
} from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
  badge: string;
}

const FAQS: FaqItem[] = [
  {
    q: "타로 카드를 뽑기 전에 질문은 어떻게 정리하는 것이 좋은가요?",
    a: "단순히 '될까요, 안 될까요?' 같은 폐쇄형 질문보다는, '현재 상황의 본질은 무엇이며 제가 어떤 태도를 취해야 할까요?', '이 관계에서 서로가 마주한 과제는 무엇인가요?'처럼 구체적이고 주체적인 열린 질문을 떠올리는 것이 훨씬 깊고 통찰력 있는 AI 리딩 결과를 이끌어냅니다.",
    badge: "질문 작성법"
  },
  {
    q: "12종 스프레드 중 처음엔 어떤 것을 선택해야 할까요?",
    a: "오늘 하루의 기운이나 단순한 선택에는 '원카드(One Card)'를, 사건의 흐름이나 과거-현재-미래의 인과관계를 파악하려면 '3카드 시간 흐름'을 추천합니다. 중요한 인생의 기로나 복합적인 갈등 상황에는 10장의 카드를 배치하는 정통 '켈틱 크로스(Celtic Cross)'가 가장 입체적인 해답을 제시합니다.",
    badge: "스프레드 추천"
  },
  {
    q: "타로 카드 이미지가 매번 다르게 생성되는 이유는 무엇인가요?",
    a: "AIMaster 타로점은 고정된 판본의 기성 카드 이미지를 쓰지 않고, 고객님이 선택하신 12대 화풍(르네상스 유화, 사이버펑크, 다크 고딕, 에테르 수채화 등)과 뽑힌 카드의 고유 상징 체계를 결합하여 Google Gemini AI가 실시간으로 세상에 단 하나뿐인 일러스트 카드를 연성하기 때문입니다.",
    badge: "AI 고유 일러스트"
  },
  {
    q: "내가 뽑은 카드와 상담 해석은 어디에 보관되나요?",
    a: "리딩이 완료되면 고객님의 고유 계정에 연결된 '내 보관함(/history)'에 자동으로 영구 저장됩니다. 언제든지 과거의 타로 리딩 기록을 다시 열어보거나, 카카오톡 또는 링크 공유를 통해 친구들과 상담 결과를 나눌 수 있습니다.",
    badge: "보관함 & 공유"
  },
  {
    q: "API 키(Gemini / OpenAI)는 어떻게 연동하며 안전한가요?",
    a: "타로 카드 일러스트 연성에는 Google Gemini API 키가, 심층 해석 작성에는 OpenAI API 키가 사용됩니다. 회원님의 API 키는 AIMaster 본인 키 사용 원칙(BYOK)에 따라 안전하게 브라우저 로컬스토리지 및 회원 격리 세션에 암호화 보관되며, 타인과 절대 공유되거나 관리자 서버에 남지 않습니다.",
    badge: "BYOK 보안"
  }
];

export default function TarotGuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 space-y-12 text-[#f1f5f9]">
      {/* 1. 상단 스튜디오 히어로 배너 */}
      <div className="studio-hero rounded-3xl p-6 sm:p-10 border border-purple-500/35">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-300">
            <Sparkles className="h-3.5 w-3.5" />
            정통 타로학 & AI 멀티모달 연성 가이드북 v1.20
          </div>
          <Link
            href="/draw"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white hover:from-purple-500 hover:to-indigo-500 transition-all shadow-md shadow-purple-600/30"
          >
            <span>지금 타로 카드 뽑기</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <h1 className="mt-5 text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-snug">
          내면의 질문을 비추는 거울, <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-amber-300">
            12종 정통 스프레드 & AI 고유 일러스트
          </span>{" "}
          완벽 가이드
        </h1>
        <p className="mt-3 max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
          고대 서양 신비주의의 78장 아르카나 상징 체계와 최신 생성형 AI가 만나 탄생한 맞춤형 타로 상담소입니다.
          마음을 정돈하고 카드를 뽑아 인생의 나침반을 발견해 보세요.
        </p>
      </div>

      {/* 2. 4단계 정통 타로 리딩 파이프라인 */}
      <section className="space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 font-black text-xs border border-purple-500/30">
            1
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            4단계 타로 리딩 파이프라인
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="focus-card p-5 border border-[#2a1f4e] hover:border-purple-500/50 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300 font-black text-sm mb-4 border border-purple-500/30">
              STEP 1
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-purple-400" />
              질문 정돈 & 스프레드 선정
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              연애, 재물, 커리어 등 알고 싶은 주제를 명확히 하고 질문의 깊이에 맞는 12종 스프레드 중 하나를 선택합니다.
            </p>
            <div className="mt-4 inline-block rounded-md bg-[#090614] px-2.5 py-1 text-[11px] text-purple-300 border border-[#2a1f4e]">
              12종 정통 스프레드
            </div>
          </div>

          <div className="focus-card p-5 border border-[#2a1f4e] hover:border-purple-500/50 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/15 text-pink-300 font-black text-sm mb-4 border border-pink-500/30">
              STEP 2
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Star className="h-4 w-4 text-pink-400" />
              12대 화풍 & 덱 셔플
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              사이버펑크, 르네상스 유화, 다크 고딕 등 원하는 일러스트 화풍을 고르고 신비로운 3D 덱을 정성껏 셔플합니다.
            </p>
            <div className="mt-4 inline-block rounded-md bg-[#090614] px-2.5 py-1 text-[11px] text-pink-300 border border-[#2a1f4e]">
              12대 아티스틱 화풍
            </div>
          </div>

          <div className="focus-card p-5 border border-[#2a1f4e] hover:border-purple-500/50 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 font-black text-sm mb-4 border border-cyan-500/30">
              STEP 3
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-cyan-400" />
              직관적 카드 드로우
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              스프레드 자리에 맞춰 카드를 차례대로 뽑습니다. 카드를 뒤집을 때마다 Google Gemini가 실시간으로 고유 일러스트를 연성합니다.
            </p>
            <div className="mt-4 inline-block rounded-md bg-[#090614] px-2.5 py-1 text-[11px] text-cyan-300 border border-[#2a1f4e]">
              Gemini 실시간 연성
            </div>
          </div>

          <div className="focus-card p-5 border border-[#2a1f4e] hover:border-purple-500/50 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 font-black text-sm mb-4 border border-amber-500/30">
              STEP 4
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-amber-400" />
              AI 심층 리딩 & 조언
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              모든 카드가 공개되면 카드 간의 상호작용과 배열 위치의 의미를 종합하여 심층 분석 리포트를 도출하고 보관함에 저장합니다.
            </p>
            <div className="mt-4 inline-block rounded-md bg-[#090614] px-2.5 py-1 text-[11px] text-amber-300 border border-[#2a1f4e]">
              종합 통찰 & 영구 보관
            </div>
          </div>
        </div>
      </section>

      {/* 3. 12종 정통 스프레드 매트릭스 */}
      <section className="space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 font-black text-xs border border-purple-500/30">
            2
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            12종 정통 스프레드 매트릭스 & 추천 질문
          </h2>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#2a1f4e] bg-[#120d24]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#2a1f4e] bg-[#090614] text-slate-300 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5 font-bold">스프레드 명칭</th>
                <th className="px-5 py-3.5 font-bold">카드 수</th>
                <th className="px-5 py-3.5 font-bold">적합한 질문 유형</th>
                <th className="px-5 py-3.5 font-bold">핵심 해석 관점</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a1f4e] text-slate-300">
              <tr className="hover:bg-[#1c1536]/50 transition-colors">
                <td className="px-5 py-4 font-bold text-purple-300">원카드 (One Card)</td>
                <td className="px-5 py-4 font-semibold text-amber-400">1장</td>
                <td className="px-5 py-4">오늘의 운세, 단순한 질문, 핵심 메시지</td>
                <td className="px-5 py-4 text-slate-400">현재 순간의 가장 강렬한 상징적 조언</td>
              </tr>
              <tr className="hover:bg-[#1c1536]/50 transition-colors">
                <td className="px-5 py-4 font-bold text-purple-300">3카드 시간 흐름</td>
                <td className="px-5 py-4 font-semibold text-amber-400">3장</td>
                <td className="px-5 py-4">과거-현재-미래의 인과관계, 사건의 전개</td>
                <td className="px-5 py-4 text-slate-400">흐름의 전환점 및 다가올 미래의 가능성</td>
              </tr>
              <tr className="hover:bg-[#1c1536]/50 transition-colors">
                <td className="px-5 py-4 font-bold text-pink-300 flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-pink-400" />
                  3카드 궁합 & 관계
                </td>
                <td className="px-5 py-4 font-semibold text-amber-400">3장</td>
                <td className="px-5 py-4">나의 마음, 상대방의 마음, 두 사람의 연결점</td>
                <td className="px-5 py-4 text-slate-400">감정의 교차점과 관계 개선의 열쇠</td>
              </tr>
              <tr className="hover:bg-[#1c1536]/50 transition-colors">
                <td className="px-5 py-4 font-bold text-purple-300">5카드 심층 분석</td>
                <td className="px-5 py-4 font-semibold text-amber-400">5장</td>
                <td className="px-5 py-4">문제의 본질, 장애물, 잠재의식, 해결책</td>
                <td className="px-5 py-4 text-slate-400">외부 상황과 내면 갈등의 입체적 조율</td>
              </tr>
              <tr className="hover:bg-[#1c1536]/50 transition-colors">
                <td className="px-5 py-4 font-bold text-amber-300">켈틱 크로스 (Celtic Cross)</td>
                <td className="px-5 py-4 font-semibold text-amber-400">10장</td>
                <td className="px-5 py-4">인생의 대전환점, 종합 운세, 복합 갈등</td>
                <td className="px-5 py-4 text-slate-400">타로의 꽃 — 10개 위치의 완벽한 총체적 리딩</td>
              </tr>
              <tr className="hover:bg-[#1c1536]/50 transition-colors">
                <td className="px-5 py-4 font-bold text-cyan-300 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-cyan-400" />
                  커리어 & 진로 스프레드
                </td>
                <td className="px-5 py-4 font-semibold text-amber-400">6장</td>
                <td className="px-5 py-4">이직, 창업, 취업, 현재 직장에서의 성장성</td>
                <td className="px-5 py-4 text-slate-400">재능의 발휘 가능성과 실천적 커리어 로드맵</td>
              </tr>
              <tr className="hover:bg-[#1c1536]/50 transition-colors">
                <td className="px-5 py-4 font-bold text-purple-300">한 해 운세 (Year Ahead)</td>
                <td className="px-5 py-4 font-semibold text-amber-400">12장</td>
                <td className="px-5 py-4">1월부터 12월까지의 월별 흐름과 기운</td>
                <td className="px-5 py-4 text-slate-400">사계절 12개월의 월별 운세 및 주의사항</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. 78장 타로 덱 구조 인포그래픽 */}
      <section className="space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 font-black text-xs border border-purple-500/30">
            3
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            78장 타로 아르카나 덱 구조 해설
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* 메이저 아르카나 */}
          <div className="rounded-2xl border border-purple-500/35 bg-[#120d24] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-purple-200 flex items-center gap-2">
                <Star className="h-5 w-5 text-purple-400" />
                22장 메이저 아르카나 (Major Arcana)
              </h3>
              <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-bold text-purple-300">
                0번 바보 ~ 21번 세계
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              영혼의 영적 여정과 인생의 거대한 숙명적 사건, 삶의 전환점을 상징합니다. 
              메이저 아르카나가 리딩 결과에 많이 나타날수록 해당 질문은 사소한 일상을 넘어 본인의 정체성과 운명에 깊은 영향을 미치는 중대한 사안임을 의미합니다.
            </p>
          </div>

          {/* 마이너 아르카나 */}
          <div className="rounded-2xl border border-[#2a1f4e] bg-[#120d24] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <Layers className="h-5 w-5 text-amber-400" />
                56장 마이너 아르카나 (Minor Arcana)
              </h3>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                4대 원소 수트
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              일상생활의 구체적인 상황, 감정의 변화, 사건의 세부 묘사를 담당합니다.
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="rounded-lg bg-[#090614] p-2 border border-[#2a1f4e] flex items-center gap-1.5 text-red-300">
                <Flame className="h-3.5 w-3.5 text-red-400" />
                <span>완드(Wands): 열정·행동</span>
              </div>
              <div className="rounded-lg bg-[#090614] p-2 border border-[#2a1f4e] flex items-center gap-1.5 text-blue-300">
                <Droplet className="h-3.5 w-3.5 text-blue-400" />
                <span>컵(Cups): 감정·사랑</span>
              </div>
              <div className="rounded-lg bg-[#090614] p-2 border border-[#2a1f4e] flex items-center gap-1.5 text-cyan-300">
                <Wind className="h-3.5 w-3.5 text-cyan-400" />
                <span>소드(Swords): 이성·갈등</span>
              </div>
              <div className="rounded-lg bg-[#090614] p-2 border border-[#2a1f4e] flex items-center gap-1.5 text-emerald-300">
                <Mountain className="h-3.5 w-3.5 text-emerald-400" />
                <span>펜타클(Pentacles): 물질·현실</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 100% 회원 본인 키(BYOK) 원칙 및 개인정보 보안 배너 */}
      <section className="rounded-2xl border border-purple-500/35 bg-gradient-to-r from-purple-500/15 via-[#120d24] to-purple-500/5 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/35">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-purple-200 flex items-center gap-2">
              100% 회원 본인 API 키(BYOK) 원칙 & 사적인 리딩 내역 비공개 보장
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              AIMaster 타로점은 회원의 소중한 개인적 고민과 리딩 내역을 타인이나 관리자 공용 캐시와 일체 공유하지 않습니다.
              Google Gemini 및 OpenAI API 키는 본인 계정에만 암호화되어 안전하게 연동되며, 회원 탈퇴 시 모든 상담 데이터는 완벽히 파기됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* 6. 자주 묻는 질문 FAQ 5종 아코디언 */}
      <section className="space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 font-black text-xs border border-purple-500/30">
            4
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            자주 묻는 질문 (FAQ)
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="focus-card overflow-hidden border border-[#2a1f4e] transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left hover:bg-[#1c1536]/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
                      {faq.badge}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-200">
                      {faq.q}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-purple-300 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-[#2a1f4e] bg-[#090614] p-5 text-xs text-slate-300 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 하단 퀵 액션 카드 */}
      <div className="rounded-2xl border border-[#2a1f4e] bg-[#120d24] p-8 text-center space-y-4">
        <h3 className="text-lg font-bold text-white">
          지금 바로 나만의 신비로운 타로 카드를 뽑아보세요
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          마음을 가라앉히고 질문을 떠올려보세요. AI가 세상에 하나뿐인 일러스트 카드와 진솔한 조언을 전해드립니다.
        </p>
        <Link
          href="/draw"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-600/30"
        >
          <span>타로 카드 뽑기 시작하기</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
