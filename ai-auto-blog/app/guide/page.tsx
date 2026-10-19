"use client";

import { useState } from "react";
import Link from "next/link";
import { APP_VERSION } from "@/utils/version";

interface FaqItem {
  q: string;
  a: string;
  category: string;
}

const FAQ_LIST: FaqItem[] = [
  {
    q: "AI 글쓰기에 사용할 수 있는 AI 모델은 어떤 것이 있나요?",
    a: "Google Gemini 2.5 Flash, OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet을 자유롭게 선택하여 본문을 생성할 수 있습니다. 이미지는 Google Gemini의 고화질 이미지 엔진인 NanoBanana 2K, 4K, Pro 모델이 자동으로 연동되어 섹션별 맞춤 삽화를 생성합니다.",
    category: "AI 모델",
  },
  {
    q: "크롬 확장 프로그램(Chrome Extension)은 어떻게 연동하나요?",
    a: "좌측 사이드바의 [🔑 API키등록·플랫폼연동] 메뉴로 이동하여 '크롬 확장 프로그램 연동 토큰'을 복사한 뒤, 브라우저에 설치된 BLOG 확장 프로그램 팝업에 붙여넣으시면 1회 연동으로 영구 사용하실 수 있습니다.",
    category: "확장 프로그램",
  },
  {
    q: "네이버 블로그 저품질(유사문서) 위험을 피하려면 어떻게 해야 하나요?",
    a: "1) 본문 생성 시 'AI 글쓰기 폼'에서 나만의 경험이나 관점을 1~2줄 추가하세요. 2) 생성된 고화질 나노바나나 이미지는 AI가 실시간 생성한 고유 이미지이므로 이미지 저품질 위험이 없습니다. 3) Tiptap 에디터에서 소제목과 문맥을 검수하고 나만의 말투로 다듬어 발행하시면 안전합니다.",
    category: "SEO 최적화",
  },
  {
    q: "API 키와 생성된 블로그 글 데이터는 안전하게 보관되나요?",
    a: "100% 회원 본인의 개인 API 키(BYOK)만 사용하며 플랫폼 운영자 키로 폴백되지 않습니다. 모든 작성된 글감과 이미지는 Supabase RLS(Row Level Security)로 회원 본인에게만 완벽히 격리되며, 생성일 기준 30일 후 자동 삭제되어 개인정보와 비용이 철저히 보호됩니다.",
    category: "보안·원칙",
  },
  {
    q: "이미지 생성이 실패하거나 특정 장면에 이미지가 안 나올 땐 어떻게 하나요?",
    a: "Gemini API 일시적 쿼터 초과나 네트워크 지연이 발생할 경우, 해당 섹션의 이미지만 건너뛰고 본문은 정상 완성됩니다. 글 작성 완료 후 상세 에디터(/posts/[id]/edit)에서 '즉석 이미지 생성' 버튼을 눌러 언제든 추가로 삽화를 생성할 수 있습니다.",
    category: "트러블슈팅",
  },
];

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
      {/* =================== HERO HEADER =================== */}
      <section className="studio-hero p-6 sm:p-8 mb-10">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                <span>📖 OFFICIAL GUIDEBOOK</span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-white/80 text-blue-700 border border-blue-200">
                {APP_VERSION}
              </span>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white/80 hover:bg-white border border-slate-200 transition-all shadow-xs"
            >
              <span>← 메인 콘솔로 복귀</span>
            </Link>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-3">
            BLOG(원문)생성 자동화 마스터 가이드
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mb-6 leading-relaxed">
            최신 트렌드 글감 발굴부터 멀티 AI 본문 작성, 나노바나나 고화질 삽화 자동 삽입, Tiptap 리치 에디터 검수 및 크롬 확장 프로그램 연동까지 블로그 자동화의 모든 과정을 완벽히 마스터하세요.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/write/ai-form"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-md shadow-blue-500/20"
            >
              <span>✨ AI 글쓰기 시작하기</span>
            </Link>
            <Link
              href="/candidates"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 transition-all"
            >
              <span>🔍 글감·토픽 수집하기</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =================== 1. 4단계 프로세스 파이프라인 =================== */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>⚡ 4단계 블로그 자동화 파이프라인</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              체계적인 4단계 워크플로우를 통해 고품질의 블로그 원문을 1분 안에 완성합니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* STEP 1 */}
          <div className="guide-card p-5 border-t-4 border-t-blue-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                STEP 01
              </span>
              <span className="text-xl">🔍</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">글감 & 토픽 수집</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              HTTP 뉴스, RSS 피드, Perplexity 실시간 검색, 유튜브 쇼츠 트렌드를 자동 수집하여 유망한 블로그 주제를 발굴합니다.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-blue-600">
              <span>권장 메뉴:</span>
              <Link href="/candidates" className="underline hover:text-blue-800">
                게시글 주제 수집
              </Link>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="guide-card p-5 border-t-4 border-t-indigo-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                STEP 02
              </span>
              <span className="text-xl">✏️</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">AI 본문 & 나노바나나 삽화</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              GPT-4o, Claude 3.5, Gemini 2.5 중 원하는 모델로 서론-본론-결론의 전문 본문을 구성하고, 나노바나나가 섹션별 2K/4K 고화질 삽화를 생성합니다.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600">
              <span>권장 메뉴:</span>
              <Link href="/write/ai-form" className="underline hover:text-indigo-800">
                AI 글쓰기 폼
              </Link>
            </div>
          </div>

          {/* STEP 3 */}
          <div className="guide-card p-5 border-t-4 border-t-violet-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                STEP 03
              </span>
              <span className="text-xl">📝</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">Tiptap 리치 에디터 검수</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              작성된 초안을 Tiptap WYSIWYG 에디터에서 확인하고 볼드, 하이라이트, 인용구, 테이블, 이미지 캡션을 손쉽게 다듬고 교정합니다.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-violet-600">
              <span>권장 메뉴:</span>
              <Link href="/" className="underline hover:text-violet-800">
                게시글 상세 에디터
              </Link>
            </div>
          </div>

          {/* STEP 4 */}
          <div className="guide-card p-5 border-t-4 border-t-emerald-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                STEP 04
              </span>
              <span className="text-xl">🚀</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">블로그 발행 & 확장 연동</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              크롬 확장 프로그램을 통해 네이버 블로그 스마트에디터 ONE 또는 티스토리 에디터로 이미지와 서식을 1초 만에 원클릭 자동 입력합니다.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
              <span>권장 메뉴:</span>
              <Link href="/settings" className="underline hover:text-emerald-800">
                확장 프로그램 연동
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =================== 2. AI 모델 & 이미지 엔진 매트릭스 =================== */}
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>🤖 지원 AI 모델 및 이미지 엔진 비교 매트릭스</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            원하는 콘텐츠 성격에 맞춰 가장 적합한 본문 생성 모델과 이미지 엔진을 조합해 보세요.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-4">구분</th>
                <th className="p-4">엔진 명칭</th>
                <th className="p-4">핵심 강점 및 스타일</th>
                <th className="p-4">추천 블로그 분야</th>
                <th className="p-4">필요 API 키</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 font-bold text-blue-600 bg-blue-50/30">본문 생성 (기본)</td>
                <td className="p-4 font-black text-slate-900">Google Gemini 2.5 Flash</td>
                <td className="p-4">초고속 생성 속도, 최신 웹 지식 반영, 자연스러운 한국어 문체</td>
                <td className="p-4">IT/테크, 최신 트렌드, 정보성 리뷰</td>
                <td className="p-4 font-semibold text-slate-500">Gemini API 키</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 font-bold text-indigo-600 bg-indigo-50/30">본문 생성 (프리미엄)</td>
                <td className="p-4 font-black text-slate-900">OpenAI GPT-4o</td>
                <td className="p-4">치밀한 논리 전개, 전문적인 문단 구조, 감성 카피라이팅</td>
                <td className="p-4">전문 비즈니스, 재테크, 심층 칼럼</td>
                <td className="p-4 font-semibold text-slate-500">OpenAI API 키</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 font-bold text-violet-600 bg-violet-50/30">본문 생성 (전문가)</td>
                <td className="p-4 font-black text-slate-900">Anthropic Claude 3.5 Sonnet</td>
                <td className="p-4">정교한 뉘앙스 표현, 장문 서사 구성, 뛰어난 가독성</td>
                <td className="p-4">브랜드 스토리텔링, 에세이, 가이드북</td>
                <td className="p-4 font-semibold text-slate-500">Anthropic API 키</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-4 font-bold text-emerald-600 bg-emerald-50/30">이미지 엔진</td>
                <td className="p-4 font-black text-slate-900">NanoBanana 2K / 4K / Pro</td>
                <td className="p-4">본문 맥락 맞춤 고해상도 생성, 불필요한 가짜 텍스트 배제, 실사/일러스트</td>
                <td className="p-4">모든 블로그 섹션별 맞춤 삽화</td>
                <td className="p-4 font-semibold text-slate-500">Gemini API 키</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* =================== 3. 검색엔진 최적화(SEO) 7대 수칙 =================== */}
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>🎯 네이버 & 구글 검색엔진 최적화(SEO) 7대 수칙</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            상위 노출과 C-Rank / DIA 로직을 통과하기 위한 실전 블로그 발행 원칙입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-base font-black text-blue-600 mb-1">01. 형태소 기반 키워드 밀도</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              본문 전체 글자수(1,500자~2,500자) 기준 핵심 키워드는 4~6회 자연스럽게 분산되어야 하며 인위적인 반복은 피해야 합니다.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-base font-black text-indigo-600 mb-1">02. 소제목(H2/H3) 계층화</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              문서의 구조를 소제목 3~5개로 나누고, 검색 사용자가 궁금해하는 질문형 소제목을 배치하여 체류 시간을 확보합니다.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-base font-black text-violet-600 mb-1">03. 고유 이미지 분산 배치</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              나노바나나로 생성된 맞춤 이미지를 문단 사이에 3장 이상 배치하여 가독성을 높이고 시각적 지루함을 방지합니다.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-base font-black text-emerald-600 mb-1">04. 첫 3문장의 강력한 훅(Hook)</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              독자의 문제 상황에 깊이 공감하고, 이 글을 끝까지 읽었을 때 얻을 수 있는 명확한 이점을 서두에 제시합니다.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-base font-black text-amber-600 mb-1">05. 불릿 포인트 & 요약 박스</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              모바일 스크롤 환경에 맞춰 핵심 결론을 체크리스트나 인용구 상자로 정리해 가독성을 극대화합니다.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-base font-black text-rose-600 mb-1">06. 명확한 콜투액션(CTA)</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              결론부에서 독자에게 질문을 던져 댓글과 스크랩을 유도하고, 관련 추가 글 링크를 안내하여 블로그 체류를 연장합니다.
            </p>
          </div>
        </div>
      </section>

      {/* =================== 4. 100% BYOK & RLS 보안 원칙 =================== */}
      <section className="mb-12 p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-2">
              🔒 100% 개인 소유 & 격리 보안 원칙
            </div>
            <h3 className="text-lg sm:text-xl font-black">
              회원 본인 키 사용 & Supabase RLS 완벽 격리
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              모든 AI 생성 및 외부 API 호출은 사용자가 직접 등록한 본인 키로만 처리되며, 플랫폼 공용 키 폴백이 일절 없습니다. 작성된 게시글과 이미지는 Supabase RLS 정책에 의해 회원 본인만 접근할 수 있으며, 생성일 기준 30일 후 안전하게 자동 삭제됩니다.
            </p>
          </div>
          <Link
            href="/settings"
            className="shrink-0 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition-all shadow-md cursor-pointer"
          >
            내 API 키 설정 관리 →
          </Link>
        </div>
      </section>

      {/* =================== 5. FAQ 아코디언 =================== */}
      <section className="mb-10">
        <div className="mb-6">
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>❓ 자주 묻는 질문 (FAQ)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            BLOG 원문 생성 자동화 이용 중 가장 많이 문의하시는 질문과 답변입니다.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_LIST.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="guide-card overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 cursor-pointer bg-white hover:bg-slate-50/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      {faq.category}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {faq.q}
                    </span>
                  </div>
                  <span className="text-slate-400 font-bold text-base shrink-0">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/30">
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
