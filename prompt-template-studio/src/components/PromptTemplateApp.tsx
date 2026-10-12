"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { PromptLibrary } from "./PromptLibrary";
import { PromptFormModal } from "./PromptFormModal";
import { PromptExecuteModal } from "./PromptExecuteModal";
import { BackupModal } from "./BackupModal";
import { ApiKeyModal } from "./ApiKeyModal";
import { HelpModal } from "./HelpModal";
import { PromptTemplate } from "@/types/prompt";
import { DEFAULT_PROMPTS, DEFAULT_CATEGORIES } from "@/data/presets";

interface PromptTemplateAppProps {
  userEmail?: string | null;
}

const STORAGE_KEY_PROMPTS = "aimaster_prompt_templates";
const STORAGE_KEY_CATEGORIES = "aimaster_prompt_categories";

export function PromptTemplateApp({ userEmail }: PromptTemplateAppProps) {
  const [currentTab, setTab] = useState<"library" | "backup">("library");
  const [prompts, setPrompts] = useState<PromptTemplate[]>(DEFAULT_PROMPTS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");

  // 모달 상태
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editPrompt, setEditPrompt] = useState<PromptTemplate | null>(null);

  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [executingPrompt, setExecutingPrompt] = useState<PromptTemplate | null>(null);

  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);

  // 로컬스토리지에서 기존 프롬프트 및 카테고리 불러오기
  useEffect(() => {
    try {
      const savedPrompts = localStorage.getItem(STORAGE_KEY_PROMPTS);
      if (savedPrompts) {
        const parsed = JSON.parse(savedPrompts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPrompts(parsed);
        }
      }

      const savedCats = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      if (savedCats) {
        const parsedCats = JSON.parse(savedCats);
        if (Array.isArray(parsedCats) && parsedCats.length > 0) {
          setCategories(parsedCats);
        }
      }
    } catch (e) {
      console.error("로컬 스토리지 데이터 로드 실패:", e);
    }
  }, []);

  // API 키 상태 확인
  useEffect(() => {
    fetch("/api/user-key")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasKey) {
          setMaskedKey(data.maskedKey);
        }
      })
      .catch((err) => console.error("API 키 상태 조회 실패:", err));
  }, []);

  // 변경 시 로컬스토리지 자동 저장
  const savePromptsToStorage = (updated: PromptTemplate[]) => {
    setPrompts(updated);
    try {
      localStorage.setItem(STORAGE_KEY_PROMPTS, JSON.stringify(updated));
    } catch (e) {
      console.error("스토리지 저장 실패:", e);
    }
  };

  const saveCategoriesToStorage = (updated: string[]) => {
    setCategories(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(updated));
    } catch (e) {
      console.error("카테고리 저장 실패:", e);
    }
  };

  // 프롬프트 생성 / 수정
  const handleSavePrompt = (
    promptData: Omit<PromptTemplate, "id" | "createdAt">,
    editId?: string
  ) => {
    if (editId) {
      const updated = prompts.map((p) =>
        p.id === editId ? { ...p, ...promptData } : p
      );
      savePromptsToStorage(updated);
    } else {
      const newPrompt: PromptTemplate = {
        ...promptData,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      savePromptsToStorage([newPrompt, ...prompts]);
    }
    setEditPrompt(null);
  };

  // 프롬프트 삭제
  const handleDeletePrompt = (id: string) => {
    if (confirm("이 프롬프트 템플릿을 삭제하시겠습니까?")) {
      const updated = prompts.filter((p) => p.id !== id);
      savePromptsToStorage(updated);
    }
  };

  // 카테고리 추가
  const handleAddCategory = (catName: string) => {
    if (!categories.includes(catName)) {
      const updated = [...categories, catName];
      saveCategoriesToStorage(updated);
      setActiveCategory(catName);
    }
  };

  // 프롬프트 실행 모달 열기
  const handleOpenExecute = (prompt: PromptTemplate) => {
    setExecutingPrompt(prompt);
    setExecuteModalOpen(true);
  };

  // 프롬프트 수정 모달 열기
  const handleOpenEdit = (prompt: PromptTemplate) => {
    setEditPrompt(prompt);
    setFormModalOpen(true);
  };

  // 새 프롬프트 모달 열기
  const handleOpenCreate = () => {
    setEditPrompt(null);
    setFormModalOpen(true);
  };

  // 백업 모달 열기 (사이드바 3번 또는 메인에서 호출)
  const handleOpenBackup = () => {
    setBackupModalOpen(true);
  };

  // 백업 파일 가져오기
  const handleImportPrompts = (imported: PromptTemplate[], overwrite: boolean) => {
    let resultList: PromptTemplate[] = [];
    if (overwrite) {
      resultList = imported;
    } else {
      const existingIds = new Set(prompts.map((p) => p.id));
      const newItems = imported.filter((item) => !existingIds.has(item.id));
      resultList = [...newItems, ...prompts];
    }
    savePromptsToStorage(resultList);

    // 새 카테고리 자동 합산
    const allCats = new Set([...categories]);
    imported.forEach((p) => {
      if (p.category) allCats.add(p.category);
    });
    saveCategoriesToStorage(Array.from(allCats));
  };

  // 백엔드 API: 프롬프트 실행
  const handleExecutePromptApi = async (substitutedPrompt: string): Promise<string> => {
    const res = await fetch("/api/execute-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptText: substitutedPrompt }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.needApiKey) {
        setApiKeyModalOpen(true);
      }
      throw new Error(data.error || "실행 중 오류가 발생했습니다.");
    }

    return data.text;
  };

  // 백엔드 API: AI 변수 자동 채우기
  const handleAutoFillApi = async (
    title: string,
    description: string,
    variables: string[]
  ): Promise<Record<string, string>> => {
    const res = await fetch("/api/auto-fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, variables }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.needApiKey) {
        setApiKeyModalOpen(true);
      }
      throw new Error(data.error || "AI 자동 채우기 실패");
    }

    return data.values;
  };

  // 백엔드 API: 템플릿 필드 AI 제안
  const handleCallSuggestApi = async (
    field: "title" | "description" | "content",
    context: { title?: string; description?: string; content?: string; category?: string }
  ): Promise<string> => {
    const res = await fetch("/api/suggest-field", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, ...context }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.needApiKey) {
        setApiKeyModalOpen(true);
      }
      throw new Error(data.error || "AI 제안 호출 실패");
    }

    return data.text;
  };

  // API 키 저장
  const handleSaveKey = async (apiKey: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/user-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMaskedKey(data.maskedKey);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row antialiased text-neutral-900 font-sans">
      {/* 플랫폼 표준 좌측 사이드바 */}
      <Sidebar
        currentTab={currentTab}
        setTab={(tab) => {
          if (tab === "backup") {
            setBackupModalOpen(true);
          } else {
            setTab(tab);
          }
        }}
        onOpenCreate={handleOpenCreate}
        onOpenApiKey={() => setApiKeyModalOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
        userEmail={userEmail}
        totalCount={prompts.length}
      />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 min-h-screen overflow-y-auto p-4 md:p-8">
        <PromptLibrary
          prompts={prompts}
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          onAddCategory={handleAddCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenCreate={handleOpenCreate}
          onEditPrompt={handleOpenEdit}
          onDeletePrompt={handleDeletePrompt}
          onExecutePrompt={handleOpenExecute}
        />
      </main>

      {/* 새 프롬프트 / 수정 모달 */}
      <PromptFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSave={handleSavePrompt}
        editPrompt={editPrompt}
        categories={categories}
        onCallSuggest={handleCallSuggestApi}
      />

      {/* 프롬프트 실행 모달 */}
      <PromptExecuteModal
        isOpen={executeModalOpen}
        onClose={() => setExecuteModalOpen(false)}
        prompt={executingPrompt}
        onExecute={handleExecutePromptApi}
        onAutoFill={handleAutoFillApi}
      />

      {/* 백업 & 복원 모달 */}
      <BackupModal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        prompts={prompts}
        onImportPrompts={handleImportPrompts}
      />

      {/* API 키 연동 모달 */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        maskedKey={maskedKey}
        onSaveKey={handleSaveKey}
      />

      {/* 사용 가이드 모달 */}
      <HelpModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />
    </div>
  );
}
