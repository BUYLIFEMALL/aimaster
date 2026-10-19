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
      title: "카드 저장 & SNS 공유",
      desc: "나의 성격유형 프로필 카드를 이미지로 저장하거나, 카카오톡 및 인스타그램 스토리 공유용 동적 OG 링크로 즉시 배포합니다.",
      icon: <Share2 className="w-5 h-5 text-amber-600" />,
      badge: "카카오/인스타 OG 연동",
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
      a: "아닙니다. 성격코드 LAB은 100% 프라이버시 보호를 원칙으로 합니다. 사용자의 문항 선택과 채점 연산은 모두 사용자의 브라우저 로컬에서 안전하게 처리되며, 서버 데이터베이스에 사용자의 응답 내역이 저장되지 않습니다.",
    },
    {
      q: "시간이 지난 후 다시 검사하면 결과가 달라질 수 있나요?",
      a: "네, 성격코드는 고정된 운명이 아니며 개인의 성숙, 환경 변화, 직업적 경험에 따라 선호 경향이 자연스럽게 유연해질 수 있습니다. 6개월~1년 주기로 재검사해보시면 자신의 성장 궤적을 확인하실 수 있습니다.",
    },
    {
      q: "결과 카드를 인스타그램이나 카카오톡으로 어떻게 공유하나요?",
      a: "검사 완료 후 결과 화면 하단의 [카카오톡 공유하기] 버튼을 누르면 나의 유형 카드와 대표 뱃지가 카카오톡 메시지로 전송되며, [링크 복사]를 통해 인스타그램 프로필이나 단체방에 공유하실 수 있습니다.",
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
            100% 프라이버시 보호 & 브라우저 로컬 채점 시스템
          </h3>
          <p className="text-xs text-emerald-800/80 leading-relaxed">
            성격코드 LAB은 회원의 응답 데이터를 수집하거나 외부 서버로 전송하지 않습니다. 모든 문항 채점은 사용자의 브라우저 메모리 안에서만 안전하게 연산되며, 결과 카드는 필요할 때 자유롭게 저장하거나 공유하실 수 있습니다.
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
