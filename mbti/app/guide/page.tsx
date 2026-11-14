"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  Brain,
  Lightbulb,
  Heart,
  Calendar,
  Layers,
  Share2,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const PIPELINE_STEPS = [
    {
      step: "01",
      title: "질문지 응답",
      desc: "일상적인 상황에 대한 직관적인 반응을 선택합니다. 20문항 빠른 검사 또는 60문항 정밀 검사를 선택할 수 있습니다.",
      icon: <Layers className="w-5 h-5 text-violet-600" />,
      badge: "2분 / 10분 선택",
    },
    {
      step: "02",
      title: "4대 축 독립 채점",
      desc: "융의 심리유형론을 기반으로 에너지 방향(E/I), 인식 방식(S/N), 판단 기준(T/F), 생활 양식(J/P) 4개 지표를 독립 채점합니다.",
      icon: <Brain className="w-5 h-5 text-emerald-600" />,
      badge: "독립 지표 알고리즘",
    },
    {
      step: "03",
      title: "16유형 매핑 & 프로파일",
      desc: "4개 지표의 우세 성향을 조합해 16가지 성격코드 중 하나를 도출하고, 성향 요약, 숨은 강점, 주의점 리포트를 완성합니다.",
      icon: <Sparkles className="w-5 h-5 text-rose-600" />,
      badge: "16유형 카드 생성",
    },
    {
      step: "04",
      title: "결과 공유 & 이어서 보기",
      desc: "결과 화면 아래 [카카오톡 공유] 또는 [링크 복사] 버튼으로 내 유형을 알립니다. 「이어서 보기」에서 같은 유형으로 캐릭코드·타로점으로 넘어갈 수 있습니다.",
      icon: <Share2 className="w-5 h-5 text-amber-600" />,
      badge: "카카오톡 공유 · 링크 복사",
    },
  ];

  const FAQS = [
    {
      q: "빠른 검사(20문항)와 정식 검사(60문항) 중 어떤 것을 추천하나요?",
      a: "친구들과 재미있게 결과를 나누거나 모바일에서 빠르게 확인하고 싶으시다면 '2분 빠른 검사'를, 나의 심리적 선호 경향을 보다 정확하고 입체적으로 파악하고 싶으시다면 '10분 정식 검사'를 추천합니다.",
    },
    {
      q: "공식 MBTI® 검사와 성격코드 LAB은 어떻게 다른가요?",
      a: "공식 MBTI®는 The Myers & Briggs Foundation의 등록상표 검사이며, 성격코드 LAB은 칼 융(Carl Jung)의 심리유형론 4대 이분지표 개념을 현대적으로 재해석하여 누구나 쉽고 재미있게 이용할 수 있도록 자체 제작한 심리 탐색 콘텐츠입니다.",
    },
    {
      q: "나의 검사 결과나 개인정보가 서버에 저장되나요?",
      a: "문항마다 고른 답과 채점은 지금 쓰는 브라우저 안에서만 처리되고, 서버 데이터베이스에 저장하지 않습니다. 결과 화면 주소에는 유형 코드와 4개 지표 비율(%)만 담깁니다. 저장하지 않으므로 지난 결과 목록은 없습니다. 결과를 다시 보고 싶으면 결과 화면 주소를 즐겨찾기 하거나 [링크 복사]로 보관해 주세요.",
    },
    {
      q: "시간이 지난 후 다시 검사하면 결과가 달라질 수 있나요?",
      a: "네, 성격코드는 고정된 운명이 아니며 개인의 성숙, 환경 변화, 직업적 경험에 따라 선호 경향이 자연스럽게 유연해질 수 있습니다. 6개월~1년 주기로 재검사해보시면 자신의 성장 궤적을 확인하실 수 있습니다.",
    },
    {
      q: "결과 카드를 인스타그램이나 카카오톡으로 어떻게 공유하나요?",
      a: "결과 화면 맨 아래 [💬 카카오톡 공유] 버튼을 누르면 내 유형 이름과 소개 그림이 담긴 메시지를 보낼 수 있습니다. [🔗 링크 복사]를 누르면 결과 주소가 복사되어 인스타그램 프로필·단체방 등 원하는 곳에 붙여 넣을 수 있습니다. 결과 카드를 그림 파일로 내려받는 버튼은 아직 없습니다. 공유받은 사람도 결과를 보려면 AIMaster 로그인이 필요합니다. 단, [💬 카카오톡 공유] 버튼은 회원님 본인 카카오 앱의 JavaScript 키를 메인 사이트 [API 설정](https://www.buylife.xyz/api-settings)의 「카카오 JavaScript 키」 칸에 한 번 등록해야 나타납니다(카카오 개발자 콘솔 [플랫폼 키 › JavaScript 키]에서 복사하고, 같은 화면 [JavaScript SDK 도메인]에 https://personality-code.buylife.xyz 를 추가). 한 번 등록하면 타로점·성격코드·캐릭코드·카카오톡 뉴스레터에서 함께 쓰이고, 키가 없어도 [링크 복사] 공유는 그대로 됩니다.",
    },
    {
      q: "로그인을 해야 검사할 수 있나요?",
      a: "네. 첫 화면과 이 가이드북은 누구나 볼 수 있지만, 검사와 결과 화면은 AIMaster 계정으로 로그인해야 열립니다. 계정이 없으면 로그인 화면의 [회원가입] 안내를 따라 AIMaster에서 한 번만 가입하시면 됩니다. 가입 정보에 핸드폰 번호가 없으면 번호 입력 화면으로 먼저 이동합니다.",
    },
    {
      q: "검사에 비용이 들거나 API 키가 필요한가요?",
      a: "아니요. 성격코드 검사는 AI를 쓰지 않아 API 키 등록도, 추가 비용도 없습니다. 다만 결과 화면의 「이어서 보기」로 넘어간 캐릭코드(캐릭터 그림)·타로점(카드 해석)은 그 프로그램에서 직접 버튼을 눌렀을 때만 회원님 본인 AI 키로 생성됩니다. 넘어가는 것만으로는 아무것도 만들어지지 않습니다.",
    },
    {
      q: "PC와 휴대폰에서 같이 쓸 수 있나요?",
      a: "네. 같은 계정으로 PC 1곳과 모바일 1곳에서 동시에 쓸 수 있습니다. 같은 종류의 기기(예: 다른 PC)에서 새로 로그인하면 그 종류의 이전 로그인만 끊깁니다.",
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* 🎨 가이드북 히어로 배너 */}
      <div className="studio-hero">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5 text-violet-600" />
              16 PERSONALITY CODE MANUAL
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#1c1917] tracking-tight leading-snug">
              성격코드 <span className="text-violet-600">공식 가이드북</span>
            </h1>
            <p className="text-sm text-[#78716c] leading-relaxed">
              4대 이분지표(E/I, S/N, T/F, J/P)의 작동 원리부터 16가지 유형별 소통 비결, 그리고 안심하고 즐길 수 있는 프라이버시 보안 체계를 확인하세요.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/test"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-xs md:text-sm font-bold text-white shadow-md shadow-violet-500/20 transition-all group"
            >
              <span>성격코드 검사하기</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* 시작 전 준비 */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 flex items-start gap-3.5">
        <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-amber-900">시작 전 준비 — AIMaster 로그인만 있으면 됩니다</h3>
          <p className="text-xs text-amber-900/80 leading-relaxed">
            검사와 결과 화면은 AIMaster 계정으로 로그인해야 열립니다(이 가이드북과 첫 화면은 로그인 없이 볼 수 있습니다).
            AI를 쓰지 않는 검사라 API 키 등록이나 추가 비용은 없습니다. 첫 화면에서 [빠른 검사 시작하기](20문항)
            또는 [정식 검사 시작하기](60문항)를 누르면 바로 시작되고, 마지막 문항에 답하면 결과 화면으로 자동 이동합니다.
          </p>
        </div>
      </div>

      {/* 4단계 검사 파이프라인 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
          <h2 className="text-base font-bold text-[#1c1917]">
            4단계 성격코드 진단 파이프라인
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {PIPELINE_STEPS.map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-[#e8e5df] bg-white p-4 flex flex-col justify-between hover:border-violet-300 transition-all shadow-xs group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-violet-600">{item.step}</span>
                  <span className="p-1.5 rounded-xl bg-violet-50 group-hover:bg-violet-100 transition-colors">
                    {item.icon}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-[#1c1917] mb-1.5 leading-snug">
                  {item.title}
                </h3>
                <p className="text-[11px] text-[#78716c] leading-relaxed">
                  {item.desc}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#f0ece3]">
                <span className="inline-block text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">
                  {item.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4대 이분지표 대비 매트릭스 표 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
          <h2 className="text-base font-bold text-[#1c1917]">
            4대 이분지표 핵심 해설 매트릭스
          </h2>
        </div>

        <div className="rounded-2xl border border-[#e8e5df] bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f5f2eb]/70 text-[#78716c] border-b border-[#e8e5df]">
                <tr>
                  <th className="py-3 px-4 font-bold">지표 구분</th>
                  <th className="py-3 px-4 font-bold text-center">좌측 성향</th>
                  <th className="py-3 px-4 font-bold text-center">우측 성향</th>
                  <th className="py-3 px-4 font-bold">판단 및 에너지 작동 원리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e5df] text-[#44403c]">
                <tr className="hover:bg-violet-50/30 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-violet-700">
                    에너지의 방향 (E vs I)
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-violet-600">
                    E (외향 · Extraversion)<br />
                    <span className="text-[10px] font-normal text-[#78716c]">사람·활동을 통한 충전</span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-indigo-600">
                    I (내향 · Introversion)<br />
                    <span className="text-[10px] font-normal text-[#78716c]">혼자만의 사색을 통한 충전</span>
                  </td>
                  <td className="py-3.5 px-4 text-[11px] leading-relaxed">
                    활동 에너지를 외부 세상과의 교류에서 얻는지, 내면의 생각과 감정에서 얻는지를 구분합니다.
                  </td>
                </tr>

                <tr className="hover:bg-emerald-50/30 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-emerald-700">
                    인식의 방식 (S vs N)
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                    S (감각 · Sensing)<br />
                    <span className="text-[10px] font-normal text-[#78716c]">오감과 구체적 사실 중심</span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-teal-600">
                    N (직관 · iNtuition)<br />
                    <span className="text-[10px] font-normal text-[#78716c]">패턴과 미래 가능성 중심</span>
                  </td>
                  <td className="py-3.5 px-4 text-[11px] leading-relaxed">
                    정보를 받아들일 때 눈앞의 구체적 현실에 집중하는지, 보이지 않는 의미와 직관에 집중하는지를 봅니다.
                  </td>
                </tr>

                <tr className="hover:bg-rose-50/30 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-rose-700">
                    판단의 기준 (T vs F)
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-rose-600">
                    T (사고 · Thinking)<br />
                    <span className="text-[10px] font-normal text-[#78716c]">논리와 객관적 원칙</span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-pink-600">
                    F (감정 · Feeling)<br />
                    <span className="text-[10px] font-normal text-[#78716c]">사람의 감정과 관계 조화</span>
                  </td>
                  <td className="py-3.5 px-4 text-[11px] leading-relaxed">
                    의사결정을 내릴 때 객관적 진실과 인과관계를 우선시하는지, 사람 간의 공감과 가치를 우선시하는지 판단합니다.
                  </td>
                </tr>

                <tr className="hover:bg-amber-50/30 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-amber-700">
                    생활의 양식 (J vs P)
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                    J (판단 · Judging)<br />
                    <span className="text-[10px] font-normal text-[#78716c]">계획과 체계적인 마감</span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-orange-600">
                    P (인식 · Perceiving)<br />
                    <span className="text-[10px] font-normal text-[#78716c]">유연성과 즉흥적인 적응</span>
                  </td>
                  <td className="py-3.5 px-4 text-[11px] leading-relaxed">
                    외부 환경에 대처할 때 미리 계획을 세워 정돈하는지, 상황에 따라 자발적으로 변화를 수용하는지 측정합니다.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 16가지 성격유형 4대 기질 맵 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
          <h2 className="text-base font-bold text-[#1c1917]">
            16가지 성격코드 4대 기질 맵
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-violet-800">
              <Brain className="w-4 h-4 text-violet-600" />
              <span>분석가형 (Analysts · _NT_)</span>
            </div>
            <p className="text-xs text-[#78716c] leading-relaxed">
              INTJ, INTP, ENTJ, ENTP: 지적 호기심과 전략적 사고가 뛰어난 혁신가 집단입니다. 비효율을 개선하고 거시적인 시스템을 설계하는 데 탁월합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-800">
              <Heart className="w-4 h-4 text-emerald-600" />
              <span>외교관형 (Diplomats · _NF_)</span>
            </div>
            <p className="text-xs text-[#78716c] leading-relaxed">
              INFJ, INFP, ENFJ, ENFP: 깊은 공감 능력과 인도주의적 이상을 지닌 중재자 집단입니다. 사람들의 잠재력을 이끌어내고 따뜻한 연대를 형성합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-sky-800">
              <Calendar className="w-4 h-4 text-sky-600" />
              <span>관리자형 (Sentinels · _S_J)</span>
            </div>
            <p className="text-xs text-[#78716c] leading-relaxed">
              ISTJ, ISFJ, ESTJ, ESFJ: 책임감과 헌신으로 사회와 조직의 질서를 지키는 수호자 집단입니다. 꼼꼼한 실행력과 안정적인 시스템 유지가 강점입니다.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-amber-800">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              <span>탐험가형 (Explorers · _S_P)</span>
            </div>
            <p className="text-xs text-[#78716c] leading-relaxed">
              ISTP, ISFP, ESTP, ESFP: 뛰어난 위기 적응력과 감각적인 순발력을 자랑하는 행동파 집단입니다. 즉각적인 실행과 예술적 감각으로 현장을 주도합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 100% 프라이버시 안심 로컬 연산 배너 */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-emerald-900">
            응답은 저장하지 않고 브라우저에서 채점합니다
          </h3>
          <p className="text-xs text-emerald-800/80 leading-relaxed">
            문항마다 고른 답은 서버에 저장하지 않고, 채점은 지금 쓰는 브라우저 안에서 끝납니다. 결과 화면 주소에는 유형 코드와 4개 지표 비율(%)만 담기며, 이 주소를 카카오톡 공유나 링크 복사로 나눌 수 있습니다.
          </p>
        </div>
      </div>

      {/* 자주 묻는 질문 FAQ (아코디언) */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-violet-600" />
          <h2 className="text-base font-bold text-[#1c1917]">자주 묻는 질문 (FAQ)</h2>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[#e8e5df] bg-white overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-[#1c1917] hover:text-violet-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-violet-600 font-extrabold">Q{idx + 1}.</span>
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-violet-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#a8a29e]" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-[#78716c] leading-relaxed border-t border-[#f0ece3] bg-[#faf8f5]/50">
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
