"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, FlowStep } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SourceInputPanel } from "./SourceInputPanel";
import { ChapterEditorPanel } from "./ChapterEditorPanel";
import { StyleDesignPanel } from "./StyleDesignPanel";
import { ExportPublishPanel } from "./ExportPublishPanel";
import { LivePreviewPanel } from "./LivePreviewPanel";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { HelpModal } from "@/components/modals/HelpModal";
import { EbookProject, Chapter, OutlineItem } from "@/lib/types";
import { buildStandaloneHtml } from "@/lib/template";
import { Sparkles, RefreshCw, X, AlertCircle } from "lucide-react";

const STORAGE_KEY = "ebook_studio_current_project";

const SAMPLE_PROJECT: EbookProject = {
  id: "sample-business-ai",
  title: "통찰하는 기계, 질문하는 리더",
  subtitle: "AI 시대, 리더의 새로운 역할을 탐구하다",
  author: "김지훈",
  coverImage: null,
  chapters: [
    {
      id: "ch-1",
      title: "제1장. 지시하는 관리자에서 질문하는 리더로",
      summary: "인공지능이 경영의 영역으로 들어오면서 리더에게 요구되는 역량이 근본적으로 변하고 있습니다.",
      content: `### 1.1 패러다임의 대전환: 답을 주는 사람에서 묻는 사람으로
기술의 변화만큼 중요한 것은 자신의 변화입니다. 도구를 도입하기 전에 팀의 일하는 방식과 리더의 역할을 다시 정의해야 합니다.

과거의 리더는 풍부한 경험과 지식을 바탕으로 구성원들에게 '정답'과 '방향'을 지시하는 사람이었습니다. 하지만 방대한 데이터를 실시간으로 학습하고 분석하는 생성형 AI의 등장으로, 단순한 지식의 양이나 계산 속도로는 기계를 앞설 수 없게 되었습니다.

> "훌륭한 리더는 좋은 답을 가진 사람이 아니라, 핵심을 찌르는 좋은 질문을 던질 줄 아는 사람이다."

이제 리더의 진정한 경쟁력은 **'어떤 문제를 풀어야 하는가?'**, **'우리가 간과하고 있는 본질은 무엇인가?'**를 날카롭게 정의하는 프레이밍(Framing) 역량에 있습니다.

### 1.2 인간만이 가질 수 있는 분별력과 맥락 이해
AI가 만들어낸 화려한 보고서와 전략 제안서를 맹신해서는 안 됩니다. 데이터의 맥락을 읽고, 윤리적 딜레마를 고려하며, 팀원들의 감정과 동기를 이끌어내는 것은 오직 인간 리더만이 할 수 있는 영역입니다.`,
      takeaways: [
        "정답을 지시하던 관리자에서 문제를 정의하는 질문자로 전환해야 합니다.",
        "도구 도입 이전에 팀의 일하는 방식과 문화를 먼저 재정의하세요.",
        "AI의 결과물을 무비판적으로 수용하지 않고 맥락과 분별력으로 검증해야 합니다.",
      ],
      questions: [
        "우리 팀이 이번 주에 AI를 활용하여 해결하고자 하는 가장 본질적인 문제는 무엇인가요?",
        "AI가 제시한 분석 결과 중 우리가 비판적으로 재검토해야 할 전제는 무엇이 있나요?",
      ],
    },
    {
      id: "ch-2",
      title: "제2장. 실행을 가속하는 AI 협업 워크플로우",
      summary: "개인의 생산성을 넘어 조직 전체의 실행 속도를 10배 높이는 실전 협업 전략을 다룹니다.",
      content: `### 2.1 프로세스의 병목을 발견하고 제거하기
새로운 도구를 단순히 기존 업무에 얹는 것만으로는 혁신이 일어나지 않습니다. 기존 업무 흐름에서 가장 많은 시간이 소요되는 기획, 초안 작성, 피드백 루프를 AI 협업 프로세스로 재설계해야 합니다.

### 2.2 신속한 프로토타이핑과 실패의 비용 절감
아이디어를 검증하기 위해 몇 주를 소비하던 시대는 끝났습니다. 반나절 만에 초안을 만들고 실제 시장과 고객의 피드백을 받는 초고속 실험 문화를 정착시켜야 합니다.`,
      takeaways: [
        "단순 업무 자동화를 넘어 전체 비즈니스 파이프라인을 재설계하세요.",
        "빠른 프로토타이핑으로 실험과 가설 검증 주기를 단축하세요.",
      ],
      questions: [
        "현재 우리 팀 업무에서 가장 반복적이고 소모적인 구간은 어디인가요?",
      ],
    },
    {
      id: "ch-3",
      title: "제3장. 데이터와 직관의 황금비율",
      summary: "정량적 데이터 분석과 리더의 인간적 직관이 어떻게 결합되어 최고의 의사결정을 이끄는지 살펴봅니다.",
      content: `### 3.1 숫자가 말하지 않는 행간을 읽다
데이터는 과거의 기록일 뿐 미래의 정답을 보장하지 않습니다. 탁월한 리더는 데이터의 한계를 명확히 인식하고, 고객과의 직접적인 대화와 현장의 호흡을 통해 얻은 정성적 직관을 결합합니다.

### 3.2 분별 있는 의사결정의 3원칙
1. 데이터의 출처와 가공 과정을 검증하라.
2. 상반된 가설을 AI에게 질문하여 편향을 제거하라.
3. 최종 결정의 책임은 인간 리더가 진다.`,
      takeaways: [
        "데이터는 판단의 보조 지표이며 직관과 현장 감각이 결합되어야 합니다.",
        "편향을 줄이기 위해 AI에게 반대 논리를 적극적으로 질문하세요.",
      ],
      questions: [
        "최근 데이터만 믿고 내렸다가 놓쳤던 요소는 무엇이 있었나요?",
      ],
    },
  ],
  style: {
    theme: "warm",
    font: "notoSans",
    skin: "classic",
    leading: 1.7,
    size: 17,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

interface StudioWorkspaceProps {
  userEmail?: string;
}

export function StudioWorkspace({ userEmail }: StudioWorkspaceProps) {
  const [project, setProject] = useState<EbookProject>(SAMPLE_PROJECT);
  const [currentStep, setCurrentStep] = useState<FlowStep>("source");
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // 전자책 AI 순차 생성 상태
  const [isGeneratingChapters, setIsGeneratingChapters] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
    title: string;
  } | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // 로컬 저장소 및 서버 API 키 불러오기
  useEffect(() => {
    try {
      const savedProject = localStorage.getItem(STORAGE_KEY);
      if (savedProject) {
        const parsed = JSON.parse(savedProject);
        if (parsed.title && Array.isArray(parsed.chapters)) {
          setProject(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load project from localStorage:", e);
    }

    const localKey = localStorage.getItem("ebook_studio_gemini_api_key");
    const localModel = localStorage.getItem("ebook_studio_gemini_model");
    if (localKey) setApiKey(localKey);
    if (localModel) setSelectedModel(localModel);

    fetch("/api/user/key")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.key) {
          setApiKey(data.key);
          localStorage.setItem("ebook_studio_gemini_api_key", data.key);
        }
      })
      .catch((err) => console.warn("Failed to fetch user key from server:", err));
  }, []);

  // 프로젝트 변경 시 저장
  const handleUpdateProject = (updates: Partial<EbookProject>) => {
    setProject((prev) => {
      const updated = {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("LocalStorage save error:", e);
      }
      return updated;
    });
  };

  // 새 프로젝트 시작
  const handleNewProject = () => {
    if (!confirm("새로운 전자책을 작성하시겠습니까? 현재 작업 중인 내용은 초기화됩니다.")) return;
    const fresh: EbookProject = {
      id: `project-${Date.now()}`,
      title: "",
      subtitle: "",
      author: userEmail ? userEmail.split("@")[0] : "작성자",
      chapters: [],
      sources: [],
      outline: [],
      style: {
        theme: "warm",
        font: "notoSans",
        skin: "classic",
        leading: 1.7,
        size: 17,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProject(fresh);
    setCurrentStep("source");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  };

  // 샘플 불러오기
  const handleLoadSample = () => {
    if (!confirm("완성된 비즈니스 리더십 샘플 전자책을 불러오시겠습니까?")) return;
    setProject(SAMPLE_PROJECT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_PROJECT));
    setCurrentStep("style");
  };

  // 전자책 생성 파이프라인 (Outline 순차 집필)
  const handleStartGeneration = async () => {
    if (!apiKey.trim()) {
      setIsSettingsOpen(true);
      return;
    }

    const outlineItems: OutlineItem[] = project.outline || [];
    if (outlineItems.length === 0 && project.chapters.length === 0) {
      alert("먼저 [01 원본 문서]에서 자료를 등록해 목차를 구성해 주세요.");
      setCurrentStep("source");
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setIsGeneratingChapters(true);

    const itemsToGenerate = outlineItems.length > 0 ? outlineItems : project.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      originalTitle: ch.title,
      rawContent: ch.content,
      charCount: ch.content.length,
    }));

    const total = itemsToGenerate.length;
    const currentChapters: Chapter[] = [...project.chapters];

    for (let i = 0; i < total; i++) {
      if (controller.signal.aborted) break;

      const item = itemsToGenerate[i];
      // 이미 알찬 본문이 있는 챕터는 스킵
      if (currentChapters[i]?.content && currentChapters[i].content.length > 200) {
        continue;
      }

      setGenerationProgress({
        current: i + 1,
        total,
        title: item.title,
      });

      try {
        const res = await fetch("/api/ai/chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            bookTitle: project.title,
            chapterIndex: i + 1,
            chapterTitle: item.title,
            chapterSummary: "",
            keyPoints: [],
            sourceContext: item.rawContent || project.rawSourceText || "",
            mode: project.writingMode || "detailed",
            apiKey,
            model: selectedModel,
          }),
        });

        const data = await res.json();
        if (res.ok && data.chapter) {
          const gen = data.chapter;
          const newChapter: Chapter = {
            id: currentChapters[i]?.id || `ch-${Date.now()}-${i}`,
            title: gen.title || item.title,
            summary: gen.summary || "",
            content: gen.content || "",
            takeaways: gen.takeaways || [],
            questions: gen.questions || [],
          };
          currentChapters[i] = newChapter;
          handleUpdateProject({ chapters: [...currentChapters] });
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          console.log("Generation aborted by user");
          break;
        }
        console.warn(`Chapter ${i + 1} generation failed:`, err);
      }
    }

    setIsGeneratingChapters(false);
    setGenerationProgress(null);
    setAbortController(null);
    // 생성이 끝나면 뷰어로 이동
    setCurrentStep("chapter");
  };

  // 생성 중단
  const handleCancelGeneration = () => {
    if (abortController) {
      abortController.abort();
    }
    setIsGeneratingChapters(false);
    setGenerationProgress(null);
  };

  // 빠른 다운로드
  const handleQuickDownloadHtml = () => {
    const htmlString = buildStandaloneHtml(project);
    const blob = new Blob([htmlString], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project.title || "ebook").replace(/[\\/:*?"<>|\n]/g, " ").trim()}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handlePreviewFull = () => {
    const htmlString = buildStandaloneHtml(project);
    const blob = new Blob([htmlString], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* 1. 좌측 표준 사이드바 */}
      <Sidebar
        currentStep={currentStep}
        onSelectStep={setCurrentStep}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onNewProject={handleNewProject}
        project={project}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        userEmail={userEmail}
      />

      {/* 2. 메인 컨텐츠 영역 */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* 상단 공통 헤더 */}
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onPreviewFull={handlePreviewFull}
          onQuickDownloadHtml={handleQuickDownloadHtml}
          onLoadSample={handleLoadSample}
          onNewProject={handleNewProject}
          project={project}
          hasApiKey={Boolean(apiKey.trim())}
        />

        {/* 생성 진행률 프로그레스 오버레이 바 */}
        {isGeneratingChapters && generationProgress && (
          <div className="bg-indigo-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold shadow-md animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
              <span>
                [{generationProgress.current} / {generationProgress.total}장 집필 중] :{" "}
                {generationProgress.title}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCancelGeneration}
              className="px-2.5 py-1 rounded bg-indigo-700 hover:bg-indigo-800 text-white text-[11px] font-semibold transition"
            >
              생성 중단 (이어서 하기 가능)
            </button>
          </div>
        )}

        {/* 메인 2단 작업대 (작업 패널 7단 + 라이브 뷰어 5단) */}
        <main className="flex-1 overflow-hidden p-4 md:p-6">
          <div className="grid h-full grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* 좌측 단계별 작업 패널 (7단) */}
            <div className="lg:col-span-7 h-full overflow-y-auto pr-1 custom-scrollbar">
              {currentStep === "source" && (
                <SourceInputPanel
                  project={project}
                  onUpdateProject={handleUpdateProject}
                  onNextStep={() => setCurrentStep("style")}
                  apiKey={apiKey}
                  selectedModel={selectedModel}
                />
              )}

              {currentStep === "style" && (
                <StyleDesignPanel
                  project={project}
                  onUpdateProject={handleUpdateProject}
                  onStartGeneration={handleStartGeneration}
                  isGeneratingChapters={isGeneratingChapters}
                  apiKey={apiKey}
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                />
              )}

              {currentStep === "chapter" && (
                <ChapterEditorPanel
                  project={project}
                  onUpdateProject={handleUpdateProject}
                  onNextStep={() => setCurrentStep("export")}
                  apiKey={apiKey}
                  selectedModel={selectedModel}
                />
              )}

              {currentStep === "export" && (
                <ExportPublishPanel
                  project={project}
                  onRestoreProject={(imported) => handleUpdateProject(imported)}
                />
              )}
            </div>

            {/* 우측 실시간 독서 뷰어 (5단) */}
            <div className="hidden lg:block lg:col-span-5 h-full">
              <LivePreviewPanel project={project} />
            </div>
          </div>
        </main>
      </div>

      {/* 모달 창들 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={(key) => {
          setApiKey(key);
          localStorage.setItem("ebook_studio_gemini_api_key", key);
        }}
        selectedModel={selectedModel}
        onSelectModel={(m) => {
          setSelectedModel(m);
          localStorage.setItem("ebook_studio_gemini_model", m);
        }}
      />

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
