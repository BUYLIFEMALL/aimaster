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

const STORAGE_KEY = "aimaster_detail_12p_projects_v2";

// 씬별 고해상도 상업용 상세페이지 프리셋 SVG 비주얼 생성기
function makeSceneSvg(index: number, badge: string, title: string, color: string, iconType: string): string {
  const svg = `
<svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f1f5f9;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow-${index}">
      <feDropShadow dx="0" dy="10" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.08"/>
    </filter>
  </defs>
  <rect width="600" height="800" fill="url(#bg-${index})" />
  <rect x="40" y="50" width="520" height="700" rx="28" fill="#ffffff" filter="url(#shadow-${index})" stroke="#e2e8f0" stroke-width="2"/>
  
  <!-- 상단 배지 -->
  <rect x="65" y="75" width="130" height="32" rx="16" fill="${color}18" />
  <text x="130" y="96" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="800" fill="${color}" text-anchor="middle">
    ${badge}
  </text>
  <text x="510" y="97" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="900" fill="#cbd5e1" text-anchor="end">
    #${index.toString().padStart(2, "0")}
  </text>

  <!-- 중앙 메인 비주얼 그래픽 카드 -->
  <rect x="65" y="130" width="470" height="380" rx="20" fill="#f8fafc" stroke="#f1f5f9" stroke-width="2"/>
  <circle cx="300" cy="300" r="110" fill="${color}12" />
  <circle cx="300" cy="300" r="80" fill="${color}25" />
  
  <!-- 아이콘 심볼 -->
  <circle cx="300" cy="290" r="45" fill="${color}" />
  <text x="300" y="304" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle">
    ${index}
  </text>

  <rect x="150" y="440" width="300" height="40" rx="20" fill="#ffffff" stroke="${color}40" stroke-width="2"/>
  <text x="300" y="465" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700" fill="${color}" text-anchor="middle">
    12P COUPANG ROCHET SPEC
  </text>

  <!-- 하단 텍스트 정보 -->
  <text x="300" y="570" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="22" font-weight="900" fill="#0f172a" text-anchor="middle">
    ${title}
  </text>
  <text x="300" y="605" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="500" fill="#64748b" text-anchor="middle">
    AI NANO BANANA COMMERCIAL VISUAL
  </text>

  <line x1="80" y1="645" x2="520" y2="645" stroke="#f1f5f9" stroke-width="2"/>
  <text x="300" y="685" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#94a3b8" text-anchor="middle">
    BUYLIFE E-COMMERCE DETAIL STUDIO
  </text>
</svg>
`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// 12단 풀 패키지 기본 체험용 프리셋
const DEFAULT_SAMPLE_PROJECT: DetailPageProject = {
  id: "sample-titanium-firepit-12p",
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
      bodyText: "지금 구매 시 본체 전용 수납 파우치와 내열 방염매트를 무료로 증정합니다. 재고 소진 시 사전 예고 없이 종료됩니다.",
      keyPoints: ["선착순 100개 한정", "방염매트 무료 증정", "쿠팡 로켓 무료배송"],
      imagePrompt: "Commercial promotional banner of titanium firepit on camp table, fire glow, sale badge, 8k studio shot",
      imageUrl: makeSceneSvg(1, "HOT EVENT", "선착순 런칭 특가 39% 할인", "#EA580C", "gift"),
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
      subtitle: "스마트폰 두 개 무게, 배낭에 쏙 들어가는 420g의 기적",
      bodyText: "캠핑의 낭만인 불멍, 무거운 화로대 때문에 망설이셨나요? 이제 420g의 가벼움으로 어디서든 부담 없이 불멍을 즐기세요.",
      keyPoints: ["초경량 420g 실현", "포켓 수납 초슬림 사이즈", "10초 원터치 조립"],
      imagePrompt: "Side-by-side comparison shot of bulky steel firepit vs ultra-light titanium firepit, clean studio lighting",
      imageUrl: makeSceneSvg(2, "PROBLEM & HOOK", "420g 초경량의 기적", "#2563EB", "scale"),
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
      subtitle: "타협 없는 프리미엄 소재와 초정밀 가공 기술",
      bodyText: "고온의 열에도 휘어짐이나 부식 없는 최고 등급 순수 티타늄을 채택하여 반영구적인 내구성을 자랑합니다.",
      keyPoints: ["항공기 소재 티타늄 100%", "변형 없는 극강의 내열성", "반영구적 평생 수명"],
      imagePrompt: "Studio macro hero shot of pure titanium metal plate with beautiful rainbow heat patina, 8k resolution",
      imageUrl: makeSceneSvg(3, "KEY SPEC", "항공 등급 순수 티타늄 100%", "#0F172A", "shield"),
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
      bodyText: "하단 360도 공기 흡입구 설계로 장작이 남김없이 하얗게 연소되어 연기와 그을음 걱정 없는 쾌적한 불멍을 제공합니다.",
      keyPoints: ["360도 입체 공기 순환", "완전 연소 효율 극대화", "연기/그을음 95% 감소"],
      imagePrompt: "Close-up cinematic shot of campfire wood logs burning inside sleek titanium firepit, beautiful embers rising",
      imageUrl: makeSceneSvg(4, "FEATURE 01", "360도 완전 연소 에어로 통풍구", "#DC2626", "flame"),
      aspectRatio: "3:4",
      accentColor: "#DC2626",
      status: "completed",
    },
    {
      id: "sc-5",
      index: 5,
      sectionKey: "feature2",
      badge: "FEATURE 02",
      title: "10초 완성 이지 슬라이드 조립 구조",
      subtitle: "별도 공구 없이 누구나 쓱 끼우면 끝나는 스마트 결합",
      bodyText: "복잡한 나사나 조립 도구가 전혀 필요 없습니다. 정밀 가공된 슬라이드 홈을 따라 맞물리기만 하면 10초 만에 단단히 결착됩니다.",
      keyPoints: ["무공구 원터치 슬라이드", "흔들림 없는 안전 결착", "분해 시 단 5초 수납"],
      imagePrompt: "Hands assembling lightweight titanium firepit plates effortlessly, step by step, bright studio setting",
      imageUrl: makeSceneSvg(5, "FEATURE 02", "10초 완성 슬라이드 조립", "#059669", "tool"),
      aspectRatio: "3:4",
      accentColor: "#059669",
      status: "completed",
    },
    {
      id: "sc-6",
      index: 6,
      sectionKey: "feature3",
      badge: "FEATURE 03",
      title: "감성 캠퍼의 로망, 티타늄 레인보우 파티나",
      subtitle: "불에 닿을수록 오묘하게 변하는 나만의 푸른빛 에이징",
      bodyText: "열을 가할수록 아름다운 푸른빛과 보랏빛 무지개 파티나가 피어납니다. 쓰면 쓸수록 나만의 고유한 빈티지 걸작으로 완성됩니다.",
      keyPoints: ["신비로운 무지개 산화 발색", "세상에 단 하나뿐인 에이징", "소장 가치 극대화"],
      imagePrompt: "Macro detail of heat-anodized titanium with stunning iridescent blue and purple rainbow colors, artistic bokeh",
      imageUrl: makeSceneSvg(6, "FEATURE 03", "신비로운 무지개 빛 파티나", "#7C3AED", "sparkles"),
      aspectRatio: "3:4",
      accentColor: "#7C3AED",
      status: "completed",
    },
    {
      id: "sc-7",
      index: 7,
      sectionKey: "lifestyle",
      badge: "LIFESTYLE",
      title: "깊은 밤 숲속 감성 불멍, 나만의 힐링 타임",
      subtitle: "어디서나 간편하게 펼쳐지는 아늑한 프라이빗 캠프",
      bodyText: "혼자만의 고요한 솔로 캠핑부터 친구와의 따뜻한 백패킹까지, 차가운 밤하늘 아래 따뜻한 온기와 타닥타닥 타오르는 불꽃의 낭만을 선사합니다.",
      keyPoints: ["감성 솔로 캠핑 최적화", "모닥불 감성 사운드", "백패킹 배낭 완벽 수납"],
      imagePrompt: "Cozy night camping atmosphere in forest, solo camper enjoying warm firepit, cup of warm coffee, starry sky",
      imageUrl: makeSceneSvg(7, "LIFESTYLE", "나만의 프라이빗 힐링 불멍", "#D97706", "moon"),
      aspectRatio: "3:4",
      accentColor: "#D97706",
      status: "completed",
    },
    {
      id: "sc-8",
      index: 8,
      sectionKey: "comparison",
      badge: "FACT CHECK",
      title: "일반 스텐 화로대 vs 초경량 티타늄 팩트 비교",
      subtitle: "스펙과 효율, 왜 티타늄 화로대를 선택해야 할까요?",
      bodyText: "무게 3kg의 무거운 스텐 화로대와 비교 불가! 무게는 1/7로 줄이고, 내열성과 부식 저항성은 3배 이상 강화했습니다.",
      keyPoints: ["무게: 3.2kg vs 0.42kg (압도적)", "내열 변형률: 스텐 고위험 vs 티타늄 제로", "수납 부피: 70% 대폭 감소"],
      imagePrompt: "Infographic commercial comparison split layout, heavy rusted grill vs gleaming titanium firepit, clean charts",
      imageUrl: makeSceneSvg(8, "FACT CHECK", "일반 화로대 vs 티타늄 비교", "#2563EB", "bar-chart"),
      aspectRatio: "3:4",
      accentColor: "#2563EB",
      status: "completed",
    },
    {
      id: "sc-9",
      index: 9,
      sectionKey: "close_up",
      badge: "MACRO DETAIL",
      title: "0.1mm 오차 없는 정밀 레이저 라운딩",
      subtitle: "손 베임 걱정 없는 안전한 엣지 곡면 챔퍼 가공",
      bodyText: "캠핑 중 손을 다치지 않도록 모든 패널의 절단면을 섬세하게 디버링 및 라운딩 가공했습니다. 작은 마감 하나도 타협하지 않았습니다.",
      keyPoints: ["전 모서리 안전 라운딩", "0.1mm 정밀 레이저 절삭", "프리미엄 무광 샌드블라스트 표면"],
      imagePrompt: "Extreme macro close-up of smoothly chamfered rounded titanium edges, pristine metal craftsmanship, 8k",
      imageUrl: makeSceneSvg(9, "MACRO DETAIL", "0.1mm 정밀 라운딩 안전 가공", "#475569", "zoom-in"),
      aspectRatio: "3:4",
      accentColor: "#475569",
      status: "completed",
    },
    {
      id: "sc-10",
      index: 10,
      sectionKey: "how_to",
      badge: "HOW TO USE",
      title: "누구나 1분 만에 끝내는 간편 사용 가이드",
      subtitle: "1-2-3 단계별 초간단 조립 및 사후 재정리 팁",
      bodyText: "받침대를 펼치고, 측면 연소판을 슬라이드로 결합한 뒤, 상단 냄비 받침대를 올리면 끝! 철수 시에도 털어내기만 하면 재정리 완료입니다.",
      keyPoints: ["STEP 1: 하단 프레임 전개", "STEP 2: 측면판 슬라이드 결합", "STEP 3: 상단 오덕 거치 및 점화"],
      imagePrompt: "Clean 3-step illustrated instructional photography showing simple assembly process, bright white background",
      imageUrl: makeSceneSvg(10, "HOW TO USE", "1-2-3 단계별 간편 설치 가이드", "#0284C7", "check-circle"),
      aspectRatio: "3:4",
      accentColor: "#0284C7",
      status: "completed",
    },
    {
      id: "sc-11",
      index: 11,
      sectionKey: "target",
      badge: "RECOMMENDED",
      title: "이런 분들께 강력하게 추천합니다",
      subtitle: "더 이상 무거운 장비로 고통받지 마세요!",
      bodyText: "짐 무게를 1g이라도 줄이고 싶은 백패커, 미니멀 오토캠핑을 지향하는 1~2인 캠퍼, 가볍고 감성 넘치는 불멍 화로대를 찾는 분들께 적극 추천합니다.",
      keyPoints: ["BPL(초경량 백패킹) 매니아", "장비 세팅이 번거로운 솔캠족", "감성 사진과 힐링을 즐기는 캠퍼"],
      imagePrompt: "Diverse group of happy Korean campers smiling around minimalist campfire gear, joyful outdoor atmosphere",
      imageUrl: makeSceneSvg(11, "RECOMMENDED", "이런 분들께 강력 추천합니다", "#16A34A", "users"),
      aspectRatio: "3:4",
      accentColor: "#16A34A",
      status: "completed",
    },
    {
      id: "sc-12",
      index: 12,
      sectionKey: "faq_package",
      badge: "PACKAGE & FAQ",
      title: "풀 패키지 구성품 & 100% 안심 보증 A/S",
      subtitle: "제품 수령 즉시 사용할 수 있는 풀 세트 구성",
      bodyText: "티타늄 화로대 본체, 조리용 오덕, 전용 코듀라 파우치, 내열 방염매트가 모두 포함되어 있습니다. 품질 불량 시 100% 무상 교환을 보장합니다.",
      keyPoints: ["본체 + 오덕 + 파우치 + 방염매트", "쿠팡 로켓 익일 총알 배송", "구매 후 1년 무상 A/S 보증"],
      imagePrompt: "Flat lay knolling showcase of all components: titanium plates, grill grate, rugged storage pouch, clean white backdrop",
      imageUrl: makeSceneSvg(12, "PACKAGE & FAQ", "풀 패키지 구성품 & 안심 보증", "#4F46E5", "package"),
      aspectRatio: "3:4",
      accentColor: "#4F46E5",
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
          return;
        }
      }
    } catch (e) {
      console.warn("Storage load error:", e);
    }
    // 기본 프리셋 저장
    saveProjectsToStorage([DEFAULT_SAMPLE_PROJECT]);
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

      // 생성된 씬들에 고해상도 SVG 비주얼 기본 부여 (이미지 미생성 상태에서도 가시성 확보)
      const enhancedScenes: DetailScene[] = data.scenes.map((s: DetailScene) => ({
        ...s,
        imageUrl: s.imageUrl || makeSceneSvg(s.index, s.badge, s.title, s.accentColor || "#2563EB", "view"),
      }));

      const newProject: DetailPageProject = {
        id: `proj-${Date.now()}`,
        title: formData.productName,
        platform: formData.platform,
        model: formData.model,
        productData: formData,
        scenes: enhancedScenes,
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
