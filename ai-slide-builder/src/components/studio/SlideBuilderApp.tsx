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
          <div className="max-w-7xl mx-auto">
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
