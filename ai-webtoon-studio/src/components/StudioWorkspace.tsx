"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sidebar, ActiveTab } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ProjectSection } from "@/components/ProjectSection";
import { CharacterSection } from "@/components/CharacterSection";
import { ScriptEditorSection } from "@/components/ScriptEditorSection";
import { WebtoonCanvasSection } from "@/components/WebtoonCanvasSection";
import { ScheduledSummary } from "@/components/ScheduledSummary";
import { GuideSection } from "@/components/GuideSection";
import { SettingsModal } from "@/components/SettingsModal";
import {
  AppSettings,
  DEFAULT_SETTINGS,
  DEFAULT_PROJECT,
  getStoredSettings,
  saveStoredSettings,
  getStoredProject,
  saveStoredProject,
  exportProjectToJson,
} from "@/lib/storage";
import { WebtoonProject } from "@/lib/types";
import { mergeAndDownloadLongScrollJpg, downloadAllImagesAsZip } from "@/lib/canvasMerge";
import { APP_NAME } from "@/lib/version";

interface StudioWorkspaceProps {
  userEmail: string;
}

export default function StudioWorkspace({ userEmail }: StudioWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("concept");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [project, setProject] = useState<WebtoonProject>(DEFAULT_PROJECT);

  const importFileRef = useRef<HTMLInputElement>(null);

  // 1. Load initial storage data & check URL params
  useEffect(() => {
    const localSettings = getStoredSettings();
    setSettings(localSettings);
    setProject(getStoredProject());

    // 로컬 스토리지에 API 키가 없으면 서버 DB(user_api_keys)에서 불러오기
    if (!localSettings.geminiApiKey) {
      fetch("/api/user/key")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.key) {
            setSettings((prev) => {
              const updated = { ...prev, geminiApiKey: data.key };
              saveStoredSettings(updated);
              return updated;
            });
          }
        })
        .catch(() => {});
    }

    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const stepParam = sp.get("step") as ActiveTab;
      if (["concept", "character", "script", "canvas", "guide"].includes(stepParam)) {
        setActiveTab(stepParam);
      }
      if (sp.get("modal") === "settings") {
        setIsSettingsOpen(true);
      }
    }
  }, []);

  // Update project helper
  const handleUpdateProject = (updated: Partial<WebtoonProject>) => {
    setProject((prev) => {
      const merged = { ...prev, ...updated };
      saveStoredProject(merged);
      return merged;
    });
  };

  // Export JSON
  const handleExportProject = () => {
    exportProjectToJson(project);
  };

  // Import JSON
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.title || parsed.synopsis || parsed.cuts) {
          const merged = { ...DEFAULT_PROJECT, ...parsed };
          setProject(merged);
          saveStoredProject(merged);
          alert(`'${merged.title}' 프로젝트를 성공적으로 불러왔습니다!`);
        } else {
          alert(`올바른 ${APP_NAME} 프로젝트 파일이 아닙니다.`);
        }
      } catch (err) {
        alert("JSON 파일을 파싱하는 데 실패했습니다.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Header quick downloads
  const handleHeaderDownloadZip = () => {
    downloadAllImagesAsZip(
      project.cuts || [],
      project.includeCover ? project.coverImageUrl : undefined,
      project.title,
      project.scriptText
    );
  };

  const handleHeaderDownloadMergedJpg = () => {
    mergeAndDownloadLongScrollJpg(
      project.cuts || [],
      project.includeCover ? project.coverImageUrl : undefined,
      project.title
    );
  };

  return (
    <div className="flex min-h-screen bg-[#0a0d14] text-slate-100">
      {/* 1. 좌측 표준 사이드바 */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportProject={handleExportProject}
        onImportProjectClick={() => importFileRef.current?.click()}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        userEmail={userEmail}
      />

      {/* 숨겨진 JSON 불러오기 input */}
      <input
        type="file"
        ref={importFileRef}
        onChange={handleImportFileChange}
        accept=".json"
        className="hidden"
      />

      {/* 2. 우측 메인 영역 */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* 상단 헤더 */}
        <Header
          settings={settings}
          onDownloadZip={handleHeaderDownloadZip}
          onDownloadMergedJpg={handleHeaderDownloadMergedJpg}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          hasCutsToDownload={(project.cuts || []).some((c) => Boolean(c.imageUrl))}
        />

        {/* 본문 메인 컨텐츠 */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* STEP 1: 기획 & 시놉시스 */}
          {/* v1.17 인스타 예약 대기 요약 — 컷이 없는 새 원고에서도 지난 예약을 알아볼 수 있게 */}
          {activeTab === "concept" && (
            <ScheduledSummary
              onOpen={() => {
                setActiveTab("canvas");
                // 게시 칸은 페이지 맨 아래라 위쪽 맞춤이 안 되고, 부드러운 이동은 다시 그려지는 중에 끊긴다 → 바로 이동해 칸 아래쪽(게시 기록)을 화면 아래에 맞춘다
                setTimeout(() => document.getElementById("insta-publish")?.scrollIntoView({ block: "end" }), 400);
              }}
            />
          )}

          {activeTab === "concept" && (
            <ProjectSection
              project={project}
              onChangeProject={handleUpdateProject}
              apiKey={settings.geminiApiKey}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onNextStep={() => setActiveTab("character")}
              onExportProject={handleExportProject}
              onImportProjectClick={() => importFileRef.current?.click()}
            />
          )}

          {/* STEP 2: 캐릭터 시트 설정 */}
          {activeTab === "character" && (
            <CharacterSection
              project={project}
              onChangeProject={handleUpdateProject}
              apiKey={settings.geminiApiKey}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onNextStep={() => setActiveTab("script")}
              onPrevStep={() => setActiveTab("concept")}
            />
          )}

          {/* STEP 3: 시나리오 콘티 생성 */}
          {activeTab === "script" && (
            <ScriptEditorSection
              project={project}
              onChangeProject={handleUpdateProject}
              apiKey={settings.geminiApiKey}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onNextStep={() => setActiveTab("canvas")}
              onPrevStep={() => setActiveTab("character")}
            />
          )}

          {/* STEP 4: 웹툰 제작 & 뷰어 */}
          {activeTab === "canvas" && (
            <WebtoonCanvasSection
              project={project}
              onChangeProject={handleUpdateProject}
              apiKey={settings.geminiApiKey}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onPrevStep={() => setActiveTab("script")}
            />
          )}

          {/* 📖 연동 & 사용 매뉴얼 */}
          {activeTab === "guide" && (
            <GuideSection
              onGoToStep={(step) => {
                setActiveTab(step);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-[#232b3e] bg-[#121620] py-6 text-center text-xs text-slate-400">
          <p>© 2026 AIMaster · {APP_NAME} · 사용자 개인 API 키 격리 보관 원칙 준수</p>
        </footer>
      </div>

      {/* API 키 설정 모달 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
      />
    </div>
  );
}
