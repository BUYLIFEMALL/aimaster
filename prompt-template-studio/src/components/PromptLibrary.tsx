"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Play,
  Pencil,
  Trash2,
  Briefcase,
  Code2,
  Sparkles,
  User,
  FileText,
  Bookmark,
  Check,
  X,
} from "lucide-react";
import { PromptTemplate } from "@/types/prompt";

interface PromptLibraryProps {
  prompts: PromptTemplate[];
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  onAddCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCreate: () => void;
  onEditPrompt: (prompt: PromptTemplate) => void;
  onDeletePrompt: (promptId: string) => void;
  onExecutePrompt: (prompt: PromptTemplate) => void;
}

// 카테고리별 대표 아이콘
function getCategoryIcon(cat: string) {
  const lower = cat.toLowerCase();
  if (lower.includes("business")) return <Briefcase size={14} className="text-blue-600" />;
  if (lower.includes("coding")) return <Code2 size={14} className="text-emerald-600" />;
  if (lower.includes("marketing")) return <Sparkles size={14} className="text-amber-500" />;
  if (lower.includes("personal")) return <User size={14} className="text-purple-600" />;
  if (lower.includes("writing")) return <FileText size={14} className="text-indigo-600" />;
  return <Bookmark size={14} className="text-slate-500" />;
}

export function PromptLibrary({
  prompts,
  categories,
  activeCategory,
  onSelectCategory,
  onAddCategory,
  searchQuery,
  onSearchChange,
  onOpenCreate,
  onEditPrompt,
  onDeletePrompt,
  onExecutePrompt,
}: PromptLibraryProps) {
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim()) {
      onAddCategory(newCatName.trim());
      setNewCatName("");
      setIsAddingCat(false);
    }
  };

  // 필터링된 프롬프트 목록
  const filteredPrompts = prompts.filter((p) => {
    const matchCategory =
      activeCategory === "전체" ||
      activeCategory === "All" ||
      p.category.toLowerCase() === activeCategory.toLowerCase();

    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);

    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. 상단 타이틀 & 새 프롬프트 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            라이브러리
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            원클릭으로 변수를 채워 즉시 실행하는 나만의 프롬프트 템플릿 목록입니다.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus size={15} />
          <span>새 프롬프트</span>
        </button>
      </div>

      {/* 2. 카테고리 필터 & 검색 바 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* 카테고리 칩 목록 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onSelectCategory("전체")}
            className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all cursor-pointer ${
              activeCategory === "전체" || activeCategory === "All"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            전체
          </button>

          {categories.map((cat) => {
            const isSelected = activeCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            );
          })}

          {/* 카테고리 추가 인풋/버튼 */}
          {isAddingCat ? (
            <form onSubmit={handleCreateCategory} className="flex items-center gap-1">
              <input
                type="text"
                autoFocus
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="카테고리명"
                className="w-24 px-2 py-1 text-xs border border-blue-400 rounded-lg focus:outline-hidden"
              />
              <button
                type="submit"
                className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              >
                <Check size={12} />
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCat(false)}
                className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 cursor-pointer"
              >
                <X size={12} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingCat(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-xl font-medium bg-slate-50 text-slate-500 hover:bg-slate-100 border border-dashed border-slate-300 transition-all cursor-pointer"
            >
              <Plus size={12} />
              <span>추가</span>
            </button>
          )}
        </div>

        {/* 우측 실시간 검색 입력창 */}
        <div className="relative min-w-[240px]">
          <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="프롬프트 검색..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all"
          />
        </div>
      </div>

      {/* 3. 프롬프트 카드 그리드 */}
      {filteredPrompts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-2xs space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mx-auto">
            <Search size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            검색 결과가 없습니다
          </h3>
          <p className="text-xs text-slate-500">
            다른 검색어를 입력하시거나, 새로운 프롬프트를 추가해보세요.
          </p>
          <button
            type="button"
            onClick={onOpenCreate}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all cursor-pointer"
          >
            새 프롬프트 추가하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className="group bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* 상단: 카테고리 칩 + 아이콘 */}
                <div className="flex items-center gap-1.5 mb-2.5">
                  {getCategoryIcon(prompt.category)}
                  <span className="text-[11px] font-bold text-slate-500">
                    {prompt.category}
                  </span>
                </div>

                {/* 제목 */}
                <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  {prompt.title}
                </h3>

                {/* 설명 */}
                <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {prompt.description}
                </p>
              </div>

              {/* 하단: 변수 개수 & 액션 버튼들 */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-600 font-mono">
                  {prompt.variables?.length || 0} 변수
                </span>

                <div className="flex items-center gap-1.5">
                  {/* 수정 버튼 */}
                  <button
                    type="button"
                    onClick={() => onEditPrompt(prompt)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="프롬프트 수정"
                  >
                    <Pencil size={13} />
                  </button>

                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={() => onDeletePrompt(prompt.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="프롬프트 삭제"
                  >
                    <Trash2 size={13} />
                  </button>

                  {/* 실행 버튼 */}
                  <button
                    type="button"
                    onClick={() => onExecutePrompt(prompt)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs shadow-2xs hover:shadow-sm transition-all cursor-pointer"
                  >
                    <Play size={11} className="fill-current" />
                    <span>실행</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
