"use client";

import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Loader2,
  Check,
  Save,
  Info,
} from "lucide-react";
import { PromptTemplate, extractVariables } from "@/types/prompt";

interface PromptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (promptData: Omit<PromptTemplate, "id" | "createdAt">, editId?: string) => void;
  editPrompt?: PromptTemplate | null;
  categories: string[];
  onCallSuggest: (
    field: "title" | "description" | "content",
    context: { title?: string; description?: string; content?: string; category?: string }
  ) => Promise<string>;
}

export function PromptFormModal({
  isOpen,
  onClose,
  onSave,
  editPrompt,
  categories,
  onCallSuggest,
}: PromptFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Business");
  const [loadingField, setLoadingField] = useState<string | null>(null);

  // 수정 모드 진입 시 기존 값 주입
  useEffect(() => {
    if (editPrompt) {
      setTitle(editPrompt.title || "");
      setDescription(editPrompt.description || "");
      setContent(editPrompt.content || "");
      setCategory(editPrompt.category || "Business");
    } else {
      setTitle("");
      setDescription("");
      setContent("");
      setCategory(categories[0] || "Business");
    }
  }, [editPrompt, isOpen, categories]);

  if (!isOpen) return null;

  // 실시간 추출된 변수 목록
  const detectedVariables = extractVariables(content);

  // AI 3단 제안 버튼 클릭 핸들러
  const handleSuggest = async (field: "title" | "description" | "content") => {
    try {
      setLoadingField(field);
      const res = await onCallSuggest(field, {
        title,
        description,
        content,
        category,
      });

      if (field === "title") setTitle(res);
      else if (field === "description") setDescription(res);
      else if (field === "content") setContent(res);
    } catch (err: any) {
      alert(err.message || "AI 제안 호출에 실패했습니다.");
    } finally {
      setLoadingField(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("제목과 프롬프트 템플릿 본문은 필수 입력 사항입니다.");
      return;
    }

    onSave(
      {
        title: title.trim(),
        description: description.trim(),
        content: content.trim(),
        category,
        variables: detectedVariables,
      },
      editPrompt ? editPrompt.id : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div>
            <h2 className="text-base font-black text-slate-900">
              {editPrompt ? "프롬프트 템플릿 수정" : "새 프롬프트 만들기"}
            </h2>
            <p className="text-[11px] text-slate-500">
              필요한 곳에 <code className="text-blue-600 font-bold bg-blue-50 px-1 py-0.5 rounded">{"{{변수명}}"}</code>을 넣어 재사용 가능한 템플릿을 완성하세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* 제목 & 카테고리 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  제목 <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  disabled={loadingField !== null}
                  onClick={() => handleSuggest("title")}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                  title="설명과 본문을 바탕으로 어울리는 제목 추천"
                >
                  {loadingField === "title" ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Sparkles size={11} />
                  )}
                  <span>AI 제안</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 비즈니스 콜드메일 시퀀스"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs text-slate-900 focus:outline-hidden transition-all"
              />
            </div>

            {/* 카테고리 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                카테고리
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs text-slate-800 focus:outline-hidden transition-all bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 한 줄 설명 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                간단한 설명
              </label>
              <button
                type="button"
                disabled={loadingField !== null}
                onClick={() => handleSuggest("description")}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                title="제목과 본문을 바탕으로 한 줄 설명 자동 작성"
              >
                {loadingField === "description" ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Sparkles size={11} />
                )}
                <span>AI 제안</span>
              </button>
            </div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 고객과의 첫 미팅을 성사시키는 3단계 제안 메일 템플릿"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs text-slate-900 focus:outline-hidden transition-all"
            />
          </div>

          {/* 프롬프트 템플릿 본문 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                프롬프트 템플릿 본문 <span className="text-rose-500">*</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  {"{{변수명}} 형식으로 작성"}
                </span>
                <button
                  type="button"
                  disabled={loadingField !== null}
                  onClick={() => handleSuggest("content")}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                  title="제목과 설명을 바탕으로 완성형 템플릿 자동 작성"
                >
                  {loadingField === "content" ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Sparkles size={11} />
                  )}
                  <span>AI 제안</span>
                </button>
              </div>
            </div>

            <textarea
              required
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`예시:
당신은 {{role}}입니다. 
다음 조건에 따라 {{topic}}에 대한 구체적인 기획안을 작성해주세요.

- 타겟 독자: {{audience}}
- 희망 어조: {{tone}}`}
              className="w-full p-4 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all leading-relaxed"
            />
          </div>

          {/* 실시간 감지된 변수 칩 목록 */}
          {detectedVariables.length > 0 && (
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1.5">
              <div className="flex items-center gap-1 text-[11px] font-bold text-blue-900">
                <Info size={12} className="text-blue-600" />
                <span>감지된 동적 변수 ({detectedVariables.length}개):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detectedVariables.map((v) => (
                  <span
                    key={v}
                    className="px-2 py-0.5 text-xs font-mono font-bold bg-white text-blue-700 border border-blue-200 rounded-md shadow-2xs"
                  >
                    {"{{"} {v} {"}}"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 하단 버튼 */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <Save size={14} />
              <span>{editPrompt ? "수정 완료" : "템플릿 저장"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
