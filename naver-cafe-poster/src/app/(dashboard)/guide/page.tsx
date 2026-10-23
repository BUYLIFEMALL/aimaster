"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Key, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Clock,
  Compass
} from "lucide-react";

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const FAQS = [
    {
      q: "카페 고유번호(club_id)와 게시판 번호(menu_id)는 어떻게 찾나요?",
      a: "PC 웹 브라우저에서 활동하는 네이버 카페에 접속한 뒤, 글을 올리려는 게시판을 클릭합니다. 브라우저 주소창이나 [글쓰기] 버튼에 마우스를 올렸을 때 링크 주소에 표시되는 'clubid=숫자'와 'menuid=숫자' 값을 확인하여 설정 화면에 등록하시면 됩니다."
    },
    {
      q: "네이버 카페 도배 제한이나 계정 정지를 피하려면 어떻게 운영해야 하나요?",
      a: "네이버 공식 Cafe API는 정식 권한을 통해 안전하게 게시하지만, 짧은 시간 내 과도한 연속 포스팅은 카페 운영진의 활동 정지 사유가 될 수 있습니다. 1일 1~3회 내외로 적절한 간격을 두고 발행하시고, 카페 주제와 무관한 상업적 광고글은 지양해주세요."
    },
    {
      q: "글감 수집의 3대 소스(URL, RSS, Perplexity)는 각각 어떤 차이가 있나요?",
      a: "1) HTTP URL: 특정 뉴스나 블로그 기사 링크를 넣으면 AI가 카페용 글로 재작성합니다. 2) RSS (NewsBlur): 특정 매체나 블로그의 RSS를 구독해 두면 새 글이 올라올 때마다 자동으로 수집합니다. 3) Perplexity: 실시간 트렌드 검색을 통해 최신 이슈와 데이터를 종합한 고급 글감을 생성합니다."
    },
    {
      q: "네이버 로그인 연동 토큰이 만료되면 어떻게 되나요?",
      a: "네이버 OAuth 토큰은 보안상 주기적으로 갱신되며, 리프레시 토큰이 만료되면 [API키등록·플랫폼연동] 메뉴에서 [네이버 재연동] 버튼을 한 번만 클릭해주시면 즉시 정상 복구됩니다."
    },
    {
      q: "생성된 글 초안을 검수하지 않고 바로 카페에 올릴 수 있나요?",
      a: "자동 예약 발행 스케줄을 설정하시면 수집된 글감으로 AI가 초안을 작성하여 지정된 시간에 바로 게시할 수 있습니다. 단, 초기에는 [AI 자동 글쓰기(초안)] 화면에서 AI가 생성한 문맥과 어투를 미리 확인해보시는 것을 권장합니다."
    },
    {
      q: "정기 자동 실행은 무엇으로 돌아가나요? 내 cron-job.org로 돌릴 수 있나요?",
      a: "API키등록·플랫폼연동 → ⏰ 예약 발행에서 고릅니다. 기본 「AIMaster 기본(Vercel)」은 따로 할 일 없이 사이트가 5분마다 차례를 확인해 실행합니다. 「내 cron-job.org」를 고르고 본인 무료 cron-job.org API 키를 등록하면, 정기 실행을 켤 때 본인 계정에 5분 작업이 자동으로 켜지고 켜진 정기 실행이 없으면 자동으로 멈춥니다. 글감 수집 화면의 「정기 실행 일시정지」로 전체를 잠시 멈출 수 있습니다."
    }
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-12">
      {/* 상단 비주얼 히어로 배너 */}
      <div className="studio-hero rounded-3xl p-6 sm:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-7 items-center gap-1.5 rounded-full bg-[#03c75a] px-3 text-xs font-bold text-white shadow-xs">
                <span>📖</span> 공식 사용 & 연동 매뉴얼
              </span>
              <span className="rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-xs font-bold text-[#029a45] border border-emerald-300">
                v1.20 표준 가이드
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                네이버 공식 Cafe API
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              네이버 카페 포스팅 자동화 <span className="text-[#03c75a]">완벽 가이드</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
              네이버 계정 연동, 카페 고유 ID(club_id) 추출, 3대 소스 글감 수집부터 AI 초안 생성 및 예약 발행까지 4단계 파이프라인으로 쉽게 마스터하세요.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all"
            >
              <Key className="h-4 w-4" />
              <span>연동 설정 바로가기</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 shadow-xs transition-all"
            >
              <span>대시보드로 복귀</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4단계 카페 포스팅 파이프라인 다이어그램 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>🚀</span> 4단계 네이버 카페 포스팅 파이프라인
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">글감이 수집되어 카페 게시판에 올라가기까지의 전체 흐름입니다.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="stat-card rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#03c75a] font-black text-sm">
                  1
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Setup</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">네이버 연동 & 카페 등록</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                [설정] 화면에서 네이버 계정을 연결하고, 글을 올릴 카페의 club_id와 게시판 menu_id를 등록합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
              필요: 네이버 로그인 · AI API 키
            </div>
          </div>

          {/* Step 2 */}
          <div className="stat-card rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-black text-sm">
                  2
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Collect</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">3대 소스 글감 수집</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                HTTP URL, RSS(NewsBlur), Perplexity 실시간 검색 중 하나를 선택해 인기 트렌드 글감을 수집합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
              카테고리별 분류 저장 지원
            </div>
          </div>

          {/* Step 3 */}
          <div className="stat-card rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-black text-sm">
                  3
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Generate</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">AI 초안 작성 & 검수</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                수집된 글감이나 직접 입력한 주제로 AI가 카페 회원들이 좋아하는 어투의 게시글 초안을 작성합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
              제목·본문 실시간 편집 가능
            </div>
          </div>

          {/* Step 4 */}
          <div className="stat-card rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-black text-sm">
                  4
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Publish</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">즉시 & 예약 발행</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                검수된 초안을 대상 카페 게시판으로 즉시 발행하거나, 정해진 시간에 자동으로 올라가도록 예약합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
              네이버 공식 API로 100% 안전
            </div>
          </div>
        </div>
      </div>

      {/* 카페 club_id 및 menu_id 찾는 법 가이드 매트릭스 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#03c75a] border border-emerald-200">
            핵심 설정 노하우
          </span>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            🔍 네이버 카페 club_id와 menu_id 찾는 방법
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            네이버는 보안 정책상 카페 목록을 API로 제공하지 않으므로, 글을 올릴 카페와 게시판의 고유 번호를 직접 확인해 등록합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 방법 1: PC 웹 주소창에서 확인 */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#03c75a] text-white text-xs font-bold">A</div>
              <h3 className="text-sm font-bold text-slate-900">PC 웹 브라우저에서 확인하기</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              1. PC에서 글을 올릴 카페 게시판에 접속합니다.<br />
              2. 상단 주소창을 보거나 [글쓰기] 버튼에 마우스 우클릭 후 [링크 주소 복사]를 누릅니다.<br />
              3. 복사된 주소 속 파라미터를 확인합니다:
            </p>
            <div className="rounded-xl bg-slate-900 p-3.5 text-xs font-mono text-emerald-400 space-y-1">
              <p>https://cafe.naver.com/ca-fe/cafes/<span className="text-amber-300 font-bold underline">12345678</span>/menus/<span className="text-cyan-300 font-bold underline">45</span></p>
              <div className="pt-2 text-[11px] text-slate-400 flex flex-col gap-0.5 font-sans">
                <p>• <span className="text-amber-300 font-bold">12345678</span> = 카페 고유번호 (club_id)</p>
                <p>• <span className="text-cyan-300 font-bold">45</span> = 게시판 고유번호 (menu_id)</p>
              </div>
            </div>
          </div>

          {/* 방법 2: 구버전 카페 URL에서 확인 */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#03c75a] text-white text-xs font-bold">B</div>
              <h3 className="text-sm font-bold text-slate-900">구버전/프레임 URL 형태인 경우</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              일부 네이버 카페는 구형 URL 형태를 사용할 수 있습니다. 이 경우 게시글이나 게시판 주소 뒤의 쿼리 스트링을 확인합니다.
            </p>
            <div className="rounded-xl bg-slate-900 p-3.5 text-xs font-mono text-emerald-400 space-y-1">
              <p>...ArticleList.nhn?search.clubid=<span className="text-amber-300 font-bold underline">12345678</span>&search.menuid=<span className="text-cyan-300 font-bold underline">45</span></p>
              <div className="pt-2 text-[11px] text-slate-400 flex flex-col gap-0.5 font-sans">
                <p>• <span className="text-amber-300 font-bold">clubid=</span> 뒤의 숫자가 club_id</p>
                <p>• <span className="text-cyan-300 font-bold">menuid=</span> 뒤의 숫자가 menu_id</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4.5 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-[#03c75a] shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-950 space-y-1">
            <p className="font-bold">가장 쉬운 팁:</p>
            <p className="leading-relaxed">
              카페 게시판 목록에서 해당 게시판 이름 위에 마우스 커서를 올리면, 웹 브라우저 좌측 하단 상태표시줄에 <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-800">clubid=XXXX&menuid=YY</code> 형태가 바로 보입니다!
            </p>
          </div>
        </div>
      </div>

      {/* 3대 글감 소스 비교 매트릭스 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
            스마트 글감 수집
          </span>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            📊 3대 글감 수집 소스 비교 매트릭스
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            원하는 목적에 맞춰 가장 적합한 수집 방식을 선택하여 풍성한 글감을 확보하세요.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                <th className="p-3.5">수집 방식</th>
                <th className="p-3.5">입력 파라미터</th>
                <th className="p-3.5">주요 특징 및 장점</th>
                <th className="p-3.5">추천 활용 분야</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              <tr className="hover:bg-slate-50/60">
                <td className="p-3.5 font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  HTTP URL
                </td>
                <td className="p-3.5 font-mono text-slate-700">웹 페이지 URL 링크</td>
                <td className="p-3.5">지정한 웹페이지(뉴스, 블로그, 칼럼)의 핵심 내용을 크롤링하여 카페 어투로 재구성</td>
                <td className="p-3.5">특정 보도자료, 특정 기사 리뷰, 전문 지식 공유</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="p-3.5 font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  RSS 피드 (NewsBlur)
                </td>
                <td className="p-3.5 font-mono text-slate-700">NewsBlur 계정 연동</td>
                <td className="p-3.5">구독 중인 미디어/블로그의 최신 피드를 주기적으로 자동 감지하여 글감 풀에 적재</td>
                <td className="p-3.5">정기 뉴스레터 브리핑, 업계 동향 데일리 포스팅</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="p-3.5 font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                  Perplexity 검색
                </td>
                <td className="p-3.5 font-mono text-slate-700">검색 키워드 / 질문</td>
                <td className="p-3.5">Perplexity 실시간 웹 검색 엔진으로 최신 트렌드와 팩트를 취합해 심층 글감 추출</td>
                <td className="p-3.5">최신 IT/금융 트렌드, 핫이슈 정보글, 전문 팁</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 100% BYOK 보안 원칙 배너 */}
      <div className="rounded-2xl border border-slate-200 bg-linear-to-r from-slate-900 to-slate-800 p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" />
              <span>100% 개인 소유 & 철저한 보안 원칙 (BYOK)</span>
            </div>
            <h3 className="text-xl font-bold">회원 본인 계정 & 전용 API 키만 사용합니다</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              AIMaster는 운영자나 타인의 계정으로 대신 글을 올리지 않습니다. 회원 본인의 네이버 계정과 본인의 AI 키(OpenAI/Perplexity/Gemini)로 직접 발행되어 도배나 비인가 차단 위험 없이 가장 안전합니다.
            </p>
          </div>
          <Link
            href="/settings"
            className="shrink-0 rounded-xl bg-[#03c75a] hover:bg-[#02b150] px-5 py-3 text-xs font-bold text-white shadow-xs transition-colors"
          >
            내 연동 설정 확인하기 →
          </Link>
        </div>
      </div>

      {/* 자주 묻는 질문 FAQ 5종 아코디언 */}
      <div className="space-y-4">
        <div className="px-1">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[#03c75a]" />
            <span>자주 묻는 질문 (FAQ)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">사용 중 궁금한 점을 빠르게 해결해 드립니다.</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-slate-50/80"
                >
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[#03c75a] text-xs font-black">Q</span>
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-emerald-50/30 px-5 py-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
