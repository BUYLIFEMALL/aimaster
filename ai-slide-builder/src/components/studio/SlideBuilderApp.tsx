"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import EditorSection from "@/components/studio/EditorSection";
import SlideEditor from "@/components/studio/SlideEditor";
import ActionFooter from "@/components/studio/ActionFooter";
import HelpModal from "@/components/guide/HelpModal";
import ApiKeyModal from "@/components/settings/ApiKeyModal";
import SlidePreviewModal from "@/components/studio/SlidePreviewModal";
import { PromptFormat, BaseSlide } from "@/lib/types";
import { exportToPptx } from "@/lib/pptxGenerator";

interface SlideBuilderAppProps {
  initialUserEmail?: string | null;
}

export default function SlideBuilderApp({ initialUserEmail }: SlideBuilderAppProps) {
  const [slideData, setSlideData] = useState("");
  const [promptFormat, setPromptFormat] = useState<PromptFormat>("standard");
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail || null);

  // 초기 API 키 로드
  useEffect(() => {
    fetchKeyStatus();
  }, []);

  const fetchKeyStatus = async () => {
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (data.hasKey) {
        setHasApiKey(true);
      }
    } catch {
      // ignore
    }
  };

  const parsedSlides: BaseSlide[] = React.useMemo(() => {
    if (!slideData.trim()) return [];
    try {
      const parsed = JSON.parse(slideData);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [slideData]);

  const handleExportPptx = async () => {
    if (parsedSlides.length === 0) {
      alert("다운로드할 슬라이드 데이터가 없습니다. 먼저 슬라이드를 생성해주세요.");
      return;
    }

    try {
      const title = parsedSlides.find((s) => s.type === "title")?.title || "프레젠테이션";
      await exportToPptx(parsedSlides, title);
    } catch (err: any) {
      alert(`파워포인트 생성 오류: ${err.message}`);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* 1. 표준 좌측 사이드바 (사용자 이메일 & 로그아웃 포함) */}
      <Sidebar
        userEmail={userEmail}
        selectedFormat={promptFormat}
        onSelectFormat={setPromptFormat}
        onOpenApiKey={() => setIsApiKeyModalOpen(true)}
        onOpenGuide={() => setIsHelpModalOpen(true)}
      />

      {/* 2. 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* 상단 헤더 */}
        <Header
          onOpenGuide={() => setIsHelpModalOpen(true)}
          onOpenApiKey={() => setIsApiKeyModalOpen(true)}
          hasApiKey={hasApiKey}
          userEmail={userEmail}
        />

        {/* 스튜디오 메인 작업 화면 */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* 1. 상단 플로우 위저드 웰컴 히어로 배너 */}
            <section className="studio-hero">
              <div className="max-w-3xl">
                <div className="hero-badge">
                  <span>✨</span>
                  <span>AI SLIDE BUILDER · FLOW WIZARD v1.10</span>
                </div>
                <h1 className="hero-title">
                  원고만 넣으면 완성되는 <span className="gradient-text">단계별 AI 슬라이드 제작</span>
                </h1>
                <p className="hero-desc">
                  비정형 문서나 주제 키워드만 입력하면 Gemini AI가 22가지 전문 시각화 패턴으로 구조화된 장표를 생성하고 16:9 와이드 PPTX로 즉시 변환합니다.
                </p>
                <div className="flex gap-3 mt-5 flex-wrap">
                  <a
                    href="/guide"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 backdrop-blur-sm transition-all"
                  >
                    <span>📖</span>
                    <span>사용 매뉴얼 보기</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsApiKeyModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
                  >
                    <span>🔑</span>
                    <span>API 키 설정</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 2. 3대 핵심 KPI 지표 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="kpi-card border-l-4 border-l-blue-600">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                    📊
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">22종 전문 시각화 레이아웃</h3>
                    <p className="text-[11px] text-slate-500 font-medium">프로세스 · 비교 · 통계 카드</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  표지, 프로세스, 비교분석, 타임라인, 피라미드 등 내용에 최적화된 시각화 장표를 도출합니다.
                </p>
              </div>

              <div className="kpi-card border-l-4 border-l-violet-600">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-lg">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">3대 맞춤 프롬프트 엔진</h3>
                    <p className="text-[11px] text-slate-500 font-medium">표준 · 대용량 표 · C-Suite 임원보고</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  일반 발표용부터 임원 결재용 보고서까지 목적에 맞춘 최적 분량과 논리 구조를 자동 편성합니다.
                </p>
              </div>

              <div className="kpi-card border-l-4 border-l-emerald-600">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">16:9 와이드 PPTX 내보내기</h3>
                    <p className="text-[11px] text-slate-500 font-medium">실시간 편집 & 원클릭 파워포인트</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  양방향 카드 편집기로 세부 내용을 수정한 뒤 브라우저에서 즉시 와이드스크린 PPTX로 다운로드합니다.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* 좌측 패널: 슬라이드 데이터 생성 & JSON 에디터 */}
              <div className="lg:col-span-1 h-[780px]">
                <EditorSection
                  slideData={slideData}
                  setSlideData={setSlideData}
                  promptFormat={promptFormat}
                  setPromptFormat={setPromptFormat}
                  onOpenApiKey={() => setIsApiKeyModalOpen(true)}
                  hasApiKey={hasApiKey}
                />
              </div>

              {/* 우측 패널: 슬라이드별 카드 편집기 */}
              <div className="lg:col-span-1 h-[780px]">
                <SlideEditor
                  slideData={slideData}
                  setSlideData={setSlideData}
                  onOpenPreview={() => setIsPreviewModalOpen(true)}
                />
              </div>
            </div>

            {/* 하단 내보내기 액션 & 푸터 */}
            <ActionFooter
              onExportPptx={handleExportPptx}
              hasSlides={parsedSlides.length > 0}
            />
          </div>
        </main>
      </div>

      {/* 모달 컴포넌트들 */}
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeySaved={() => {
          setHasApiKey(true);
          fetchKeyStatus();
        }}
      />
      <SlidePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        slides={parsedSlides}
        onExportPptx={handleExportPptx}
      />
    </div>
  );
}
