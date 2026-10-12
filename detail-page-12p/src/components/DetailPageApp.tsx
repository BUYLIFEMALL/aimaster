"use client";

import { useState, useEffect } from "react";
import { Sidebar, TabType } from "./Sidebar";
import { ProductInputForm } from "./ProductInputForm";
import { DetailStudioView } from "./DetailStudioView";
import { DetailHistoryView } from "./DetailHistoryView";
import { ApiKeyModal } from "./ApiKeyModal";
import { HelpModal } from "./HelpModal";
import { ProductInputData, DetailPageProject, DetailScene } from "@/types/detail";

interface DetailPageAppProps {
  userEmail?: string | null;
}

const STORAGE_KEY = "aimaster_detail_12p_projects_v1";

// 기본 체험용 프리셋
const DEFAULT_SAMPLE_PROJECT: DetailPageProject = {
  id: "sample-titanium-firepit",
  title: "초경량 접이식 티타늄 캠핑 화로대 M사이즈",
  platform: "coupang",
  model: "nano-banana",
  productData: {
    productName: "초경량 접이식 티타늄 캠핑 화로대 M사이즈",
    originalPrice: 69000,
    salePrice: 42000,
    discountRate: 39,
    platform: "coupang",
    model: "nano-banana",
    description: "항공 등급 Pure Titanium으로 제작되어 무게는 단 420g, 배낭에 쏙 들어가는 궁극의 백패킹 불멍 화로대입니다.",
    targetAudience: "미니멀 백패커, 오토캠핑 및 감성 솔로 캠퍼",
    toneAndManner: "모던 아웃도어 & 프리미엄 감성",
    eventBannerText: "기간 한정 런칭 기념 39% 즉시 할인 + 방염 매트 무료 증정",
    specDocContent: "소재: Pure Titanium Grade 1\n무게: 420g\n조립 크기: 28 x 28 x 18 cm\n수납 크기: 30 x 10 x 3 cm\n내하중: 15kg",
    productImages: [],
  },
  scenes: [
    {
      id: "sc-1",
      index: 1,
      sectionKey: "promotion",
      badge: "HOT EVENT",
      title: "선착순 런칭 특가 39% 즉시할인",
      subtitle: "전용 내열 방염매트 100% 무료 증정 이벤트",
      bodyText: "지금 구매 시 본체 전용 파우치와 내열 방염매트를 무료로 증정합니다. 재고 소진 시 사전 예고 없이 종료됩니다.",
      keyPoints: ["선착순 100개 한정", "방염매트 증정", "쿠팡 로켓 무료배송"],
      imagePrompt: "Commercial e-commerce promotional banner, titanium camping firepit displayed on wooden camping table with warm fire glow, glowing promotion text box, clean pure white studio background #ffffff, 8k resolution.",
      aspectRatio: "3:4",
      accentColor: "#EA580C",
      status: "completed",
    },
    {
      id: "sc-2",
      index: 2,
      sectionKey: "hook",
      badge: "PROBLEM & SOLUTION",
      title: "무겁고 부피만 큰 화로대는 이제 그만",
      subtitle: "스마트폰 두 개 무게, 배낭에 쏙 들어가는 기적",
      bodyText: "캠핑의 낭만인 불멍, 무거운 화로대 때문에 망설이셨나요? 이제 420g의 가벼움으로 어디서든 부담 없이 불멍을 즐기세요.",
      keyPoints: ["초경량 420g", "포켓 수납 사이즈", "10초 원터치 조립"],
      imagePrompt: "Side by side comparison shot, heavy bulky steel firepit vs ultra-light minimalist titanium firepit, clean studio lighting, realistic depth, modern aesthetics.",
      aspectRatio: "3:4",
      accentColor: "#2563EB",
      status: "completed",
    },
    {
      id: "sc-3",
      index: 3,
      sectionKey: "key_visual",
      badge: "KEY SPECIFICATION",
      title: "항공 등급 Pure Titanium 100%",
      subtitle: "타협 없는 프리미엄 소재와 정밀 가공 기술",
      bodyText: "고온의 열에도 휘어짐이나 부식 없는 최고 등급 티타늄을 채택하여 반영구적인 내구성을 자랑합니다.",
      keyPoints: ["항공기 소재 티타늄", "변형 없는 내열성", "반영구적 수명"],
      imagePrompt: "Studio macro hero shot of pure titanium metal plate with beautiful rainbow heat anodizing patina, metallic texture reflection, clean pure white background #ffffff, 8k resolution.",
      aspectRatio: "3:4",
      accentColor: "#0F172A",
      status: "completed",
    },
    {
      id: "sc-4",
      index: 4,
      sectionKey: "feature1",
      badge: "FEATURE 01",
      title: "공기 순환 에어로 다이나믹 통풍구",
      subtitle: "그을음 없이 활활 타오르는 2차 연소 설계",
      bodyText: "하단 360도 공기 흡입구 설계로 장작이 남김없이 하얗게 연소되어 연기 걱정 없는 쾌적한 불멍을 제공합니다.",
      keyPoints: ["360도 공기 순환", "완전 연소 구조", "연기/그을음 최소화"],
      imagePrompt: "Close-up cinematic shot of campfire glowing wood logs burning inside sleek titanium firepit, beautiful embers rising, dramatic lighting, sharp focus, 8k resolution.",
      aspectRatio: "3:4",
      accentColor: "#DC2626",
      status: "completed",
    },
  ],
  createdAt: "2026-10-13T00:00:00.000Z",
  updatedAt: "2026-10-13T00:00:00.000Z",
};

export function DetailPageApp({ userEmail }: DetailPageAppProps) {
  const [currentTab, setCurrentTab] = useState<TabType>("input");
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const [projects, setProjects] = useState<DetailPageProject[]>([DEFAULT_SAMPLE_PROJECT]);
  const [activeProject, setActiveProject] = useState<DetailPageProject | null>(DEFAULT_SAMPLE_PROJECT);
  const [isGenerating, setIsGenerating] = useState(false);

  // 로컬 스토리지 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProjects(parsed);
          setActiveProject(parsed[0]);
        }
      }
    } catch (e) {
      console.warn("Storage load error:", e);
    }
  }, []);

  // 프로젝트 변경 시 저장
  const saveProjectsToStorage = (updated: DetailPageProject[]) => {
    setProjects(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Storage save error:", e);
    }
  };

  // API 키 상태 확인
  const checkApiKey = async () => {
    try {
      const res = await fetch("/api/user-key");
      const data = await res.json();
      if (data.hasKey) {
        setHasKey(true);
        setMaskedKey(data.maskedKey);
      } else {
        setHasKey(false);
        setMaskedKey(null);
      }
    } catch (err) {
      console.error("API Key check error:", err);
    }
  };

  useEffect(() => {
    checkApiKey();
  }, []);

  // API 키 저장
  const handleSaveApiKey = async (newKey: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/user-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: newKey }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHasKey(true);
        setMaskedKey(data.maskedKey);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // 12단 상세페이지 전체 기획 생성 핸들러
  const handleCreateDetailPage = async (formData: ProductInputData) => {
    if (!hasKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setIsGenerating(true);

    try {
      const res = await fetch("/api/generate-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.needApiKey) setIsApiKeyModalOpen(true);
        throw new Error(data.error || "상세페이지 기획 생성에 실패했습니다.");
      }

      const newProject: DetailPageProject = {
        id: `proj-${Date.now()}`,
        title: formData.productName,
        platform: formData.platform,
        model: formData.model,
        productData: formData,
        scenes: data.scenes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [newProject, ...projects];
      saveProjectsToStorage(updated);
      setActiveProject(newProject);
      setCurrentTab("studio");
    } catch (err: any) {
      alert(`생성 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 활성 프로젝트 업데이트
  const handleUpdateActiveProject = (updatedProj: DetailPageProject) => {
    setActiveProject(updatedProj);
    const updated = projects.map((p) => (p.id === updatedProj.id ? updatedProj : p));
    saveProjectsToStorage(updated);
  };

  // 프로젝트 삭제
  const handleDeleteProject = (projectId: string) => {
    const updated = projects.filter((p) => p.id !== projectId);
    saveProjectsToStorage(updated);
    if (activeProject?.id === projectId) {
      setActiveProject(updated.length > 0 ? updated[0] : null);
      if (updated.length === 0) setCurrentTab("input");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row text-slate-900">
      {/* 표준 좌측 사이드바 */}
      <Sidebar
        currentTab={currentTab}
        setTab={setCurrentTab}
        onOpenApiKey={() => setIsApiKeyModalOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        userEmail={userEmail}
        hasKey={hasKey}
        activeProjectTitle={activeProject?.title}
        totalProjectsCount={projects.length}
      />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto max-h-screen">
        {currentTab === "input" && (
          <ProductInputForm
            initialData={activeProject?.productData}
            onSubmit={handleCreateDetailPage}
            isGenerating={isGenerating}
            onOpenApiKey={() => setIsApiKeyModalOpen(true)}
            hasKey={hasKey}
          />
        )}

        {currentTab === "studio" && activeProject && (
          <DetailStudioView
            project={activeProject}
            onUpdateProject={handleUpdateActiveProject}
            onBackToInput={() => setCurrentTab("input")}
            onOpenApiKey={() => setIsApiKeyModalOpen(true)}
            hasKey={hasKey}
          />
        )}

        {currentTab === "studio" && !activeProject && (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <p className="text-sm text-slate-500 mb-3">현재 선택된 상세페이지 프로젝트가 없습니다.</p>
            <button
              onClick={() => setCurrentTab("input")}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
            >
              새 제품 등록하기
            </button>
          </div>
        )}

        {currentTab === "history" && (
          <DetailHistoryView
            projects={projects}
            onSelectProject={(proj) => {
              setActiveProject(proj);
              setCurrentTab("studio");
            }}
            onDeleteProject={handleDeleteProject}
            onImportProjects={(imported) => saveProjectsToStorage(imported)}
            onNewProject={() => {
              setActiveProject(null);
              setCurrentTab("input");
            }}
          />
        )}
      </main>

      {/* API 키 모달 */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        maskedKey={maskedKey}
        onSaveKey={handleSaveApiKey}
      />

      {/* 사용 가이드 모달 */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
}
