"use client";
import { IS_STANDALONE } from "@/threads-content-ops/lib/deployment";
import { THREADS_CONTENT_OPS_CALLBACK_URI } from "@/threads-content-ops/lib/oauth";

import React, { useState } from "react";
import {
  BookOpen,
  Sparkles,
  Flame,
  PenLine,
  Send,
  UsersRound,
  Library,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Clock,
  Smartphone,
  Copy,
  Check
} from "lucide-react";

export default function UsageGuide() {
  const [activeTab, setActiveTab] = useState<"pipeline" | "meta" | "persona" | "affiliate" | "faq">("pipeline");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const callbackUrl = THREADS_CONTENT_OPS_CALLBACK_URI; // 독립 운영 모드면 설치한 사이트 주소(2026-10-18)

  const handleCopy = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 가이드북 히어로 배너 (라이트 테마 최적화: 앰버-슬레이트 프리미엄 카드) */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-500/10 via-amber-50/60 to-orange-50/40 p-6 shadow-sm md:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100/80 px-3 py-1 text-xs font-bold text-amber-900">
            <Sparkles size={13} className="text-amber-700" />
            <span>Threads 콘텐츠 운영 자동화 공식 가이드북</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-neutral-900 md:text-3xl">
            Threads 바이럴 운영 & 머니타이징 마스터 가이드
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700 md:text-base">
            떡상 콘텐츠 수집부터 6대 페르소나 AI 글 생성, 500자 최적화, 자동 예약 발행, 쇼핑제휴 수익화까지!
            초보자도 5분 만에 완벽히 이해하고 운영할 수 있는 실전 가이드를 제공합니다.
          </p>
        </div>

        {/* 배경 은은한 데코 칩 */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-32 h-64 w-64 rounded-full bg-orange-400/10 blur-3xl" />
      </div>

      {/* 5대 네비게이션 탭 바 */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-2">
        <button
          onClick={() => setActiveTab("pipeline")}
          style={activeTab === "pipeline" ? { backgroundColor: '#171717', color: '#ffffff' } : {}}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === "pipeline"
              ? "shadow-sm"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
          }`}
        >
          <Layers size={16} />
          <span>1. 5단계 올인원 파이프라인</span>
        </button>
        <button
          onClick={() => setActiveTab("meta")}
          style={activeTab === "meta" ? { backgroundColor: '#171717', color: '#ffffff' } : {}}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === "meta"
              ? "shadow-sm"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
          }`}
        >
          <KeyRound size={16} />
          <span>2. Meta & API 연동 매뉴얼</span>
        </button>
        <button
          onClick={() => setActiveTab("persona")}
          style={activeTab === "persona" ? { backgroundColor: '#171717', color: '#ffffff' } : {}}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === "persona"
              ? "shadow-sm"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
          }`}
        >
          <UsersRound size={16} />
          <span>3. 6대 바이럴 페르소나 비법</span>
        </button>
        <button
          onClick={() => setActiveTab("affiliate")}
          style={activeTab === "affiliate" ? { backgroundColor: '#171717', color: '#ffffff' } : {}}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === "affiliate"
              ? "shadow-sm"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
          }`}
        >
          <ShoppingBag size={16} />
          <span>4. 쇼핑제휴 머니타이징</span>
        </button>
        <button
          onClick={() => setActiveTab("faq")}
          style={activeTab === "faq" ? { backgroundColor: '#171717', color: '#ffffff' } : {}}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === "faq"
              ? "shadow-sm"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
          }`}
        >
          <HelpCircle size={16} />
          <span>5. 자주 묻는 질문 (FAQ)</span>
        </button>
      </div>

      {/* 탭 1: 5단계 올인원 파이프라인 */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-neutral-900">
              ⚡ Threads 콘텐츠 운영 5단계 마스터 프로세스
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              수집된 양질의 글감과 쇼핑 상품을 결합하여, AI가 가장 몰입도 높은 스레드 포스팅으로 재탄생시킵니다.
            </p>

            <div className="mt-8 space-y-4">
              {/* STEP 1 */}
              <div className="relative flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50/40 p-5 md:flex-row md:items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 font-extrabold text-white shadow-sm">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Flame size={16} className="text-amber-600" />
                    <h4 className="font-bold text-neutral-900">1단계: 떡상 콘텐츠 수집 (Viral Collection)</h4>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      글감 발굴
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">
                    인터넷 웹 링크(뉴스, 칼럼, 블로그), <strong>Perplexity AI 실시간 트렌드 리서치</strong>, 또는{" "}
                    <strong>유튜브 쇼츠 영상 구조 분석</strong>을 통해 알고리즘에서 이미 검증된 인기 주제와 글감을 원클릭으로 수집합니다.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-600">
                    <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">🌐 웹 URL 핵심문장 추출</span>
                    <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">🔍 Perplexity AI 트렌드 요약</span>
                    <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">🎬 쇼츠 스크립트 역분석</span>
                  </div>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="relative flex flex-col gap-4 rounded-xl border border-violet-200 bg-violet-50/40 p-5 md:flex-row md:items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 font-extrabold text-white shadow-sm">
                  2
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <PenLine size={16} className="text-violet-600" />
                    <h4 className="font-bold text-neutral-900">2단계: AI 맞춤 콘텐츠 생성 (Attention Composer)</h4>
                    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800">
                      500자 최적화
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">
                    내 계정의 분위기에 맞는 <strong>6대 페르소나 화자</strong>를 선택하고, 수집된 글감이나 등록된 제휴 상품을 클릭 한 번으로 불러옵니다.
                    스레드 알고리즘이 좋아하는 <strong>강력한 훅(Hook) ➔ 본문 전개 ➔ 댓글/CTA 유도</strong> 구조로 500자 최적화 본문을 자동 작성합니다.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-600">
                    <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">🎭 6종 페르소나 말투 선택</span>
                    <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">📏 실시간 500자 게이지 검증</span>
                    <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">🎯 훅-스토리-CTA 프레임워크</span>
                  </div>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="relative flex flex-col gap-4 rounded-xl border border-blue-200 bg-blue-50/40 p-5 md:flex-row md:items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-extrabold text-white shadow-sm">
                  3
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Send size={16} className="text-blue-600" />
                    <h4 className="font-bold text-neutral-900">3단계: 콘텐츠 보관함 & 발행 큐 (Draft & Dispatch)</h4>
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                      즉시/예약 발행
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">
                    작성된 초안을 인라인으로 자유롭게 수정하고, 카드뉴스/상품 이미지 미디어를 첨부합니다.
                    <strong>[지금 발행]</strong>을 누르면 즉시 연동된 내 Threads 계정에 업로드되며, 원하는 날짜와 시각을 지정하여 <strong>[예약 발행]</strong>할 수 있습니다.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-600">
                    <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">⚡ 즉시 원클릭 포스팅</span>
                    <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">⏰ 분 단위 정밀 예약 발행</span>
                    <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">🖼️ 다중 미디어 이미지 첨부</span>
                  </div>
                </div>
              </div>

              {/* STEP 4 */}
              <div className="relative flex flex-col gap-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 md:flex-row md:items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-extrabold text-white shadow-sm">
                  4
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <UsersRound size={16} className="text-indigo-600" />
                    <h4 className="font-bold text-neutral-900">4단계: 계정 콘셉트 & 운영 규칙 설정 (Account Concept)</h4>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
                      브랜딩 통제
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">
                    운영하는 여러 Threads 계정별로 타깃 독자, 대표 주제, 선호 말투, 하루 목표 발행 건수, 운영 시간대를 각각 다르게 설정합니다.
                    계정에서 절대 사용하지 말아야 할 <strong>금지 단어 및 금지 주제</strong>를 등록하여 브랜딩 안전성을 확보합니다.
                  </p>
                </div>
              </div>

              {/* STEP 5 */}
              <div className="relative flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 md:flex-row md:items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 font-extrabold text-white shadow-sm">
                  5
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Library size={16} className="text-emerald-600" />
                    <h4 className="font-bold text-neutral-900">5단계: 쇼핑제휴 상품 등록 (Affiliate Sources)</h4>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      수익 머니타이징
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">
                    <strong>쿠팡 파트너스</strong>(API 키 없는 직접 등록 방식 지원) 및 <strong>토스 쇼핑 베스트 30선</strong> 상품을 등록해 둡니다.
                    AI 글 생성 시 등록된 제휴 상품을 클릭하면 단축 수익 링크와 공정위 안내 문구가 자동으로 결합된 추천 글이 완성됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 탭 2: Meta & API 연동 매뉴얼 */}
      {activeTab === "meta" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-neutral-900">
              🔑 Meta Threads API 앱 등록 및 본인 키 연동 가이드
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              모든 회원은 본인의 Meta 개발자 계정과 본인 Threads 앱으로 안전하게 1:1 연동하여 포스팅 권한을 부여받습니다.
            </p>

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-700" />
                <div className="text-xs leading-relaxed text-amber-900">
                  <p className="font-bold">★ 최상위 절대 원칙: 본인 외부 계정 및 본인 API 키 직접 연동</p>
                  <p className="mt-1">
                    운영자 공용 OAuth 앱을 공유하지 않으며, 회원님 본인이 Meta for Developers에 직접 등록한 앱의 App ID/Secret을 연동해야
                    Meta 개발 모드 테스터 제약 없이 100% 정상 작동합니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {/* Step A */}
              <div className="border-l-2 border-neutral-900 pl-4">
                <h4 className="font-bold text-neutral-900">Step 1. Meta for Developers 계정 및 앱 생성</h4>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-neutral-700">
                  <li>
                    <a
                      href="https://developers.facebook.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 underline hover:text-blue-800"
                    >
                      Meta for Developers <ExternalLink size={12} />
                    </a>
                    에 접속하여 Facebook/Threads 계정으로 로그인합니다.
                  </li>
                  <li>우측 상단 <strong>[내 앱] ➔ [앱 만들기]</strong> 버튼을 클릭합니다.</li>
                  <li>앱 유형에서 <strong>[기타]</strong> 또는 <strong>[비즈니스]</strong>를 선택하고 앱 이름을 설정합니다.</li>
                </ol>
              </div>

              {/* Step B */}
              <div className="border-l-2 border-neutral-900 pl-4">
                <h4 className="font-bold text-neutral-900">Step 2. Threads API 제품 추가 및 권한 설정</h4>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-neutral-700">
                  <li>생성된 앱 대시보드에서 <strong>[제품 추가] ➔ [Threads API]</strong>를 찾아 <strong>[설정]</strong>을 클릭합니다.</li>
                  <li>
                    <strong>Threads 설정</strong> 메뉴에서 아래 2가지 필수 권한이 추가되었는지 확인합니다:
                    <div className="mt-1 flex gap-2">
                      <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs font-semibold text-neutral-800">threads_basic</span>
                      <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs font-semibold text-neutral-800">threads_content_publish</span>
                    </div>
                  </li>
                  <li>
                    <strong>리다이렉트 URI (OAuth Redirect URI)</strong> 항목에 아래 공식 콜백 주소를 정확히 등록합니다:
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
                      <code className="flex-1 font-mono text-xs text-neutral-900">{callbackUrl}</code>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-neutral-800"
                      >
                        {copiedUrl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        {copiedUrl ? "복사됨!" : "복사"}
                      </button>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Step C */}
              <div className="border-l-2 border-neutral-900 pl-4">
                <h4 className="font-bold text-neutral-900">Step 3. [API키등록·플랫폼연동] 메뉴에서 등록 후 로그인</h4>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-neutral-700">
                  <li>Meta 앱의 <strong>앱 ID(App ID)</strong>와 <strong>앱 시크릿 코드(App Secret)</strong>를 복사합니다.</li>
                  <li>Threads 운영 자동화의 <strong>[API키등록·플랫폼연동]</strong> 탭으로 이동합니다.</li>
                  <li>복사한 ID와 Secret을 저장한 뒤, <strong>[Threads 계정 연결하기]</strong> 버튼을 누르면 Meta 공식 인증창이 열리며 1초 만에 안전하게 연동 완료됩니다!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 탭 3: 6대 바이럴 페르소나 비법 */}
      {activeTab === "persona" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-neutral-900">
              🎭 스레드 알고리즘을 지배하는 6대 바이럴 페르소나
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              스레드는 일반 블로그와 문법이 완전히 다릅니다. 독자의 감정을 건드리거나 즉각적인 실용성을 주는 6가지 핵심 화자를 활용해 보세요.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Persona 1 */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition-all hover:border-neutral-900 hover:bg-white hover:shadow-sm">
                <span className="text-2xl">🌱</span>
                <h4 className="mt-2 font-bold text-neutral-900">1. 공감형 에세이 (일상·멘탈)</h4>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  퇴근길 직장인, 번아웃, 인간관계 피로를 위로하는 솔직 담백한 문체. "나만 그런 줄 알았는데 다들 그렇구나"를 유도합니다.
                </p>
                <div className="mt-3 rounded bg-neutral-100 p-2 text-[11px] text-neutral-700">
                  <strong>추천 훅:</strong> "요즘 들어 인간관계가 피곤해진 사람들의 공통점 3가지."
                </div>
              </div>

              {/* Persona 2 */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition-all hover:border-neutral-900 hover:bg-white hover:shadow-sm">
                <span className="text-2xl">⚡</span>
                <h4 className="mt-2 font-bold text-neutral-900">2. 직설형 인사이트 (팩폭·동기부여)</h4>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  군더더기 없는 문장, 단호한 문체로 독자의 정신을 번쩍 들게 하는 스타일. 저장(북마크) 수가 폭발적으로 상승합니다.
                </p>
                <div className="mt-3 rounded bg-neutral-100 p-2 text-[11px] text-neutral-700">
                  <strong>추천 훅:</strong> "부자가 되고 싶다면서 시간만 버리고 있는 당신의 착각."
                </div>
              </div>

              {/* Persona 3 */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition-all hover:border-neutral-900 hover:bg-white hover:shadow-sm">
                <span className="text-2xl">📊</span>
                <h4 className="mt-2 font-bold text-neutral-900">3. 데이터 분석가 (정보·트렌드)</h4>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  구체적인 수치, 비교표, 공식 통계를 기반으로 신뢰도를 극대화하는 전문가형 문체입니다.
                </p>
                <div className="mt-3 rounded bg-neutral-100 p-2 text-[11px] text-neutral-700">
                  <strong>추천 훅:</strong> "지난달 대비 수익률 400% 급증한 카테고리 비밀."
                </div>
              </div>

              {/* Persona 4 */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition-all hover:border-neutral-900 hover:bg-white hover:shadow-sm">
                <span className="text-2xl">💡</span>
                <h4 className="mt-2 font-bold text-neutral-900">4. 위트 일상러 (유머·꿀팁)</h4>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  친구에게 말하듯 유쾌하고 찰진 드립, 생활 밀착형 꿀팁을 전하는 친근한 스타일입니다.
                </p>
                <div className="mt-3 rounded bg-neutral-100 p-2 text-[11px] text-neutral-700">
                  <strong>추천 훅:</strong> "쿠팡에서 이거 안 사본 사람 진짜 인생 절반 손해 봄 ㅋㅋㅋ"
                </div>
              </div>

              {/* Persona 5 */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition-all hover:border-neutral-900 hover:bg-white hover:shadow-sm">
                <span className="text-2xl">🔥</span>
                <h4 className="mt-2 font-bold text-neutral-900">5. 트렌드 큐레이터 (신상·얼리어답터)</h4>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  가장 핫한 신상 제품, SNS 바이럴 아이템, 새로운 앱 정보를 발 빠르게 브리핑하는 스타일입니다.
                </p>
                <div className="mt-3 rounded bg-neutral-100 p-2 text-[11px] text-neutral-700">
                  <strong>추천 훅:</strong> "현재 품절 대란 중인 다이소/올리브영 역대급 갓성비 신상."
                </div>
              </div>

              {/* Persona 6 */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition-all hover:border-neutral-900 hover:bg-white hover:shadow-sm">
                <span className="text-2xl">🚀</span>
                <h4 className="mt-2 font-bold text-neutral-900">6. 1인 창업가 (수익화·노하우)</h4>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  직접 부딪히며 배운 비즈니스 인사이트, 실패 극복기, 부업 성공 전략을 공유하는 실전형 화자입니다.
                </p>
                <div className="mt-3 rounded bg-neutral-100 p-2 text-[11px] text-neutral-700">
                  <strong>추천 훅:</strong> "직장인 부업으로 월 200 벌기까지 딱 3가지만 바꿨습니다."
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 탭 4: 쇼핑제휴 머니타이징 */}
      {activeTab === "affiliate" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-neutral-900">
              💰 Threads 쇼핑제휴(쿠팡/토스) 머니타이징 가이드
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              스레드 피드에 자연스럽게 녹아드는 추천형 콘텐츠로 월 백만 원대 제휴 수수료를 만들어내는 방법입니다.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                <h4 className="font-bold text-neutral-900">🛒 쿠팡 파트너스 API 키 없는 직접 상품 등록 (v1.92+)</h4>
                <p className="mt-1 text-sm text-neutral-700">
                  복잡한 쿠팡 오픈 API 키 발급이 승인되지 않았어도 걱정 없습니다!
                </p>
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs text-neutral-700">
                  <li>쿠팡 파트너스 웹사이트에서 원하는 상품의 <strong>[링크 생성]</strong>을 클릭합니다.</li>
                  <li><strong>[블로그용 태그]</strong> 또는 <strong>[HTML 복사]</strong>를 누릅니다.</li>
                  <li>Threads 운영 자동화의 <strong>[쇼핑제휴 상품 등록]</strong> ➔ [쿠팡 직접 등록] 창에 그대로 붙여넣습니다.</li>
                  <li>서버가 상품명, 썸네일 이미지, 제휴 단축 링크를 1초 만에 자동 추출하여 내 상품 큐에 안전하게 등록합니다!</li>
                </ol>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                <h4 className="font-bold text-neutral-900">⚖️ 공정거래위원회 심사지침 필수 준수</h4>
                <p className="mt-1 text-sm text-neutral-700">
                  수익형 제휴 링크를 포함하여 포스팅할 때는 반드시 경제적 이해관계 표시 문구를 포함해야 합니다.
                </p>
                <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-3 font-mono text-xs text-neutral-800">
                  "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
                </div>
                <p className="mt-2 text-xs text-emerald-700 font-semibold">
                  ✓ 본 프로그램의 AI 글 생성기는 제휴 상품 선택 시 이 문구를 본문 마지막 또는 댓글 영역에 자동으로 안전하게 삽입해 줍니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 탭 5: 자주 묻는 질문 (FAQ) */}
      {activeTab === "faq" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-neutral-900">
              ❓ 자주 묻는 질문 및 트러블슈팅
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              운영 중 자주 발생하는 의문점과 에러 해결 방법을 모았습니다.
            </p>

            <div className="mt-6 space-y-3">
              {[
                {
                  q: "스레드 글자 수 제한이 500자인데, 초과하면 어떻게 되나요?",
                  a: "Meta Threads API는 본문이 500자를 단 1자라도 초과하면 포스팅 요청을 오류로 즉시 거부합니다. 본 프로그램의 [콘텐츠 생성] 에디터는 글자 수를 실시간으로 계산하여 450자 이상 시 노란색 경고, 500자 초과 시 붉은색 경고와 함께 발행 버튼을 안전하게 잠급니다."
                },
                {
                  q: "Meta Threads 토큰이 만료되었다고 나옵니다.",
                  a: "Meta의 사용자 접근 토큰은 보안상 기본 60일의 유효기간을 갖습니다. 만료 임박(14일 이내) 또는 만료 시, [API키등록·플랫폼연동] 메뉴에서 [Threads 계정 재연결]을 한 번만 클릭해 주시면 즉시 새로운 60일 토큰으로 자동 갱신됩니다."
                },
                {
                  q: "예약 발행을 걸어두면 컴퓨터를 꺼두어도 발행되나요?",
                  a: IS_STANDALONE ? "네! 내 컴퓨터가 아니라 클라우드에서 1분마다 예약 글을 확인해 정해진 시각에 Meta 공식 API로 발행합니다. 실행 방식은 「API키등록·플랫폼연동 → ⏰ 예약 발행」에서 고릅니다 — 기본 「내 cron-job.org」는 본인 무료 cron-job.org API 키만 등록하면 예약할 때 자동으로 연결되고 남은 예약이 없으면 자동으로 멈춥니다. Vercel 유료(Pro)라면 KIT/enable-vercel-cron으로 Vercel 예약 호출을 켜고 그 방식을 고를 수도 있습니다. 콘텐츠 보관함 위에서 전체 일시정지·재개도 할 수 있습니다." : "네! 사용자의 로컬 컴퓨터에서 실행되는 것이 아니라, Vercel 클라우드 서버의 크론(Cron) 서비스가 1분 단위로 대기 중인 예약 글을 확인하여 정해진 시각에 Meta 공식 API를 통해 자동으로 발행합니다. 컴퓨터나 스마트폰을 꺼두셔도 정상 포스팅됩니다."
                },
                {
                  q: "여러 개의 Threads 계정을 번갈아 운영할 수 있나요?",
                  a: "네, 가능합니다! [계정 콘셉트 설정] 탭에서 여러 계정을 등록해 두고, 글을 생성하거나 발행할 때 타깃 계정을 간편하게 드롭다운으로 선택하여 계정별 분리 운영이 가능합니다."
                },
                {
                  q: "게시글에 이미지는 몇 장까지 첨부할 수 있나요?",
                  a: "Threads는 최대 10장의 캐러셀 이미지를 지원합니다. 본 프로그램의 보관함에서 미디어를 첨부하면 고화질 규격(JPEG/PNG, 1:1 또는 4:5 비율 권장)으로 자동 최적화되어 안전하게 게시됩니다."
                }
              ].map((faq, idx) => (
                <div key={idx} className="rounded-xl border border-neutral-200 bg-neutral-50/50">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="flex w-full items-center justify-between p-4 text-left font-bold text-neutral-900 transition hover:text-amber-600"
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {openFaq === idx && (
                    <div className="border-t border-neutral-200 p-4 text-sm leading-relaxed text-neutral-700 bg-white rounded-b-xl">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
