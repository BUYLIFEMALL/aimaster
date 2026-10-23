"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { PageHero } from "@/components/ui/PageHero";
import { AppSettings, DEFAULT_SETTINGS } from "@/lib/types";
import { getStoredSettings } from "@/lib/storage";

const PIPELINE = [
  { icon: "🔑", title: "본인 키 등록", desc: "Gemini 키를 「API키등록·플랫폼연동」에 저장 (AI 분석에만 필요)", time: "약 2분" },
  { icon: "🌐", title: "URL 입력 · 크롤링", desc: "주소를 넣고 「⚡ 크롤링 시작」— 페이지를 7가지로 자동 분류", time: "5~15초" },
  { icon: "🎯", title: "시각적 섹터 선택", desc: "실제 화면에서 원하는 목록 영역을 클릭해 골라내기 (선택)", time: "1분" },
  { icon: "🤖", title: "AI 지능형 분석", desc: "반복 목록을 순번·제목·링크·썸네일 표로 정리", time: "10~30초" },
  { icon: "📥", title: "내보내기", desc: "탭마다 CSV, 이미지 ZIP, 전체 JSON으로 저장", time: "바로" },
];

const TABS = [
  { icon: "📄", name: "개요", desc: "페이지 제목·설명·상태 코드·크기" },
  { icon: "🤖", name: "AI 분석", desc: "Gemini가 정리한 목록 표 + 검색·CSV" },
  { icon: "🧱", name: "구조", desc: "H1·H2 제목 계층 (SEO 점검용)" },
  { icon: "📝", name: "글목록", desc: "자동 감지한 반복 글·상품 카드 + 검색" },
  { icon: "📊", name: "표", desc: "페이지 안 <table>을 그대로 CSV로" },
  { icon: "🔗", name: "링크", desc: "모든 링크와 외부 링크 표시 + 검색" },
  { icon: "🖼️", name: "이미지", desc: "이미지 미리보기 + ZIP 일괄 저장" },
];

const SHORTCUTS = [
  { key: "클릭", desc: "가리킨 요소를 캡처" },
  { key: "Shift + 클릭", desc: "한 단계 위(목록 전체) 선택" },
  { key: "Ctrl/Cmd + 클릭", desc: "그 링크 페이지로 이동해 이어서 수집" },
];

const FAQ = [
  {
    q: "Gemini 키가 없어도 쓸 수 있나요?",
    a: "네. 크롤링·분류·CSV·이미지 ZIP은 키 없이 됩니다. 「AI 지능형 분석」만 회원님 본인 Gemini 키가 필요합니다(운영자 키로 대신 처리하지 않음).",
  },
  {
    q: "어떤 사이트는 내용이 거의 안 보여요.",
    a: "로그인이 필요한 페이지, 화면을 그린 뒤 자바스크립트로 내용을 불러오는 사이트, 봇 접속을 막는 사이트는 일부만 수집될 수 있습니다. 이럴 땐 「시각적 섹터 선택」으로 실제 화면에서 영역을 골라 보세요.",
  },
  {
    q: "회사 내부망이나 내 PC 주소도 수집되나요?",
    a: "아니요. 보안을 위해 인터넷에 공개된 주소만 수집하며, 내부·사설 네트워크 주소는 막혀 있습니다.",
  },
  {
    q: "수집한 결과는 어디에 남나요?",
    a: "마지막 수집 결과 1건이 이 브라우저에 저장됩니다. 오래 보관하려면 「데이터 내보내기 (JSON)」나 탭별 CSV로 저장하세요.",
  },
];

export function GuideShell({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    setSettings(getStoredSettings());
  }, []);

  const goWorkspace = () => router.push("/");
  const openSettings = () => router.push("/?settings=1");

  return (
    <div className="flex min-h-screen bg-mx-bg">
      <Sidebar
        currentStep={null}
        onSelectStep={goWorkspace}
        onOpenSettings={openSettings}
        onOpenSectorModal={goWorkspace}
        onExportJson={() => {}}
        crawlResult={null}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        userEmail={userEmail}
        activePage="guide"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header settings={settings} onOpenSettings={openSettings} onOpenMobileNav={() => setIsMobileNavOpen(true)} />

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <PageHero
            badge="📖 연동 & 사용 매뉴얼"
            title="3분 만에 익히는 Website Scraper"
            description="주소 하나로 웹페이지를 분류하고, 반복 목록을 AI로 표처럼 정리해 파일로 내려받는 방법을 단계별로 안내합니다."
          >
            <Link href="/" className="mx-btn-primary">
              ⚡ 바로 수집하러 가기
            </Link>
          </PageHero>

          {/* 안내 캐릭터 */}
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mx-primary text-2xl">🕷️</div>
            <div className="mx-card rounded-tl-none p-4">
              <p className="text-sm leading-relaxed text-mx-text">
                안녕하세요, 수집 도우미예요! 주소만 알려 주시면 페이지를 <b>개요·구조·글목록·표·링크·이미지</b>로 나눠 드리고,
                복잡한 게시판이나 상품 목록은 <b>AI가 깔끔한 표</b>로 정리해 드려요. 공개된 페이지라면 대부분 바로 됩니다.
              </p>
            </div>
          </div>

          {/* 5단계 파이프라인 */}
          <section className="mx-card">
            <h2 className="mx-section-title">🧭 사용 순서</h2>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {PIPELINE.map((step, idx) => (
                <li key={step.title} className="relative flex flex-col rounded-xl border border-mx-border bg-mx-raised p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mx-primary text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <span className="mx-chip px-2 py-0.5 text-[11px]">⏱ {step.time}</span>
                  </div>
                  <span className="mt-3 text-3xl">{step.icon}</span>
                  <span className="mt-2 text-sm font-bold text-mx-text">{step.title}</span>
                  <span className="mt-1 text-xs leading-relaxed text-mx-muted">{step.desc}</span>
                  {idx < PIPELINE.length - 1 && (
                    <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-lg text-mx-accent lg:block">›</span>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {/* 결과 7탭 지도 */}
          <section className="mx-card">
            <h2 className="mx-section-title">🗺️ 결과 화면 7개 탭</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {TABS.map((t) => (
                <div key={t.name} className="flex items-start gap-3 rounded-xl bg-mx-raised p-3">
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-mx-text">{t.name}</p>
                    <p className="text-xs text-mx-muted">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 시각적 섹터 선택 단축키 */}
          <section className="mx-card">
            <h2 className="mx-section-title">🎯 시각적 섹터 선택 — 마우스 단축키</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {SHORTCUTS.map((s) => (
                <div key={s.key} className="rounded-xl bg-mx-raised p-4 text-center">
                  <kbd className="inline-block rounded-lg border border-mx-border border-b-4 bg-mx-surface px-3 py-1.5 font-mono text-sm font-bold text-mx-text">
                    {s.key}
                  </kbd>
                  <p className="mt-2 text-xs text-mx-muted">{s.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-mx-muted">
              고른 영역은 오른쪽 패널에서 확인한 뒤 「이 섹터로 AI 리스트 분석」을 누르면 그 부분만 AI로 정리합니다.
            </p>
          </section>

          {/* 팁·주의 */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[#065f46] bg-[#064e3b]/40 p-4">
              <p className="text-sm font-bold text-[#a7f3d0]">💡 TIP</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-[#d1fae5]">
                <li>글목록·링크·AI 결과 탭의 검색창으로 원하는 항목만 남긴 뒤 CSV로 받으면 그 결과만 저장됩니다.</li>
                <li>게시판 1페이지만 보이면 「시각적 섹터 선택」에서 Ctrl/Cmd + 클릭으로 다음 페이지로 이동해 이어서 수집하세요.</li>
                <li>AI 분석은 페이지 전체보다 목록 영역만 골라 맡길 때 더 정확합니다.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#92400e] bg-[#78350f]/40 p-4">
              <p className="text-sm font-bold text-[#fde68a]">⚠️ 꼭 알아 두세요</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-[#fef3c7]">
                <li>AI 분석은 회원님 <b>본인 Gemini 키</b>로만 처리됩니다(운영자 키 대신 사용 없음).</li>
                <li>수집한 글·이미지의 저작권은 원래 사이트에 있습니다. 재게시·상업적 이용 전에 이용 약관을 확인하세요.</li>
                <li>짧은 시간에 같은 사이트를 너무 자주 수집하면 그 사이트가 접속을 막을 수 있습니다.</li>
              </ul>
            </div>
          </div>

          {/* 키 발급 */}
          <section className="mx-card">
            <h2 className="mx-section-title">🔑 Gemini 키 발급 3단계</h2>
            <ol className="grid gap-3 md:grid-cols-3">
              {[
                { n: 1, t: "Google AI Studio 접속", d: "Google 계정으로 로그인" },
                { n: 2, t: "API 키 만들기", d: "「Create API key」로 키를 만들고 복사" },
                { n: 3, t: "등록 완료", d: "「API키등록·플랫폼연동」에 붙여 넣고 연결 테스트 → 저장" },
              ].map((s) => (
                <li key={s.n} className="rounded-xl bg-mx-raised p-3">
                  <span className="mx-chip-blue">STEP {s.n}</span>
                  <p className="mt-2 text-sm font-bold text-mx-text">{s.t}</p>
                  <p className="text-xs text-mx-muted">{s.d}</p>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="mx-btn-ghost">
                <ExternalLink className="h-4 w-4" />
                Gemini 키 발급
              </a>
              <button type="button" onClick={openSettings} className="mx-btn-primary">
                🔑 지금 키 등록하기
              </button>
            </div>
          </section>

          {/* FAQ */}
          <section className="mx-card">
            <h2 className="mx-section-title">❓ 자주 묻는 질문</h2>
            <div className="space-y-2">
              {FAQ.map((f) => (
                <details key={f.q} className="group rounded-xl bg-mx-raised p-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-mx-text">
                    <span className="mr-1 text-mx-accent group-open:hidden">＋</span>
                    <span className="mr-1 hidden text-mx-accent group-open:inline">－</span>
                    {f.q}
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-mx-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
