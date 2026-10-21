"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Sparkles,
  Loader2,
  Check,
  Save,
  Info,
} from "lucide-react";
import { PromptTemplate, extractVariables } from "@/types/template";

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
  /** 본문에서 바뀌는 부분을 찾아 「원래 문구 → 변수 이름」 목록을 받는다(2026-10-21 v1.08) */
  onSuggestVariables?: (content: string) => Promise<VariableSuggestion[]>;
  /** 결과 화면에서 넘어온 초안이면 열릴 때 한 번 자동으로 변수를 제안한다 */
  autoSuggestVariables?: boolean;
}

export interface VariableSuggestion {
  name: string;
  original: string;
}

/** 고른 문구를 {{변수}}로 바꾼다. 긴 문구부터 바꿔 짧은 문구가 긴 문구 일부를 먼저 바꾸지 않게 한다. */
function applyVariables(text: string, picks: VariableSuggestion[]): string {
  return [...picks]
    .sort((a, b) => b.original.length - a.original.length)
    .reduce((acc, s) => acc.split(s.original).join(`{{${s.name}}}`), text);
}

export function PromptFormModal({
  isOpen,
  onClose,
  onSave,
  editPrompt,
  categories,
  onCallSuggest,
  onSuggestVariables,
  autoSuggestVariables = false,
}: PromptFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Business");
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [varSuggestions, setVarSuggestions] = useState<(VariableSuggestion & { checked: boolean })[] | null>(null);
  const [varMessage, setVarMessage] = useState("");
  const autoRanFor = useRef<PromptTemplate | null>(null);

  const handleSuggestVariables = async (text: string) => {
    if (!onSuggestVariables || !text.trim()) return;
    try {
      setLoadingField("variables");
      setVarMessage("");
      const list = await onSuggestVariables(text);
      setVarSuggestions(list.map((s) => ({ ...s, checked: true })));
      if (list.length === 0) setVarMessage("바꿔 쓸 만한 부분을 찾지 못했습니다. 필요한 곳에 직접 {{변수명}}을 넣어 주세요.");
    } catch (err: any) {
      setVarMessage(err.message || "변수 찾기에 실패했습니다. 직접 {{변수명}}을 넣어 주세요.");
    } finally {
      setLoadingField(null);
    }
  };

  // 결과 화면에서 넘어온 초안(아직 저장 전 · 변수 0개)이면 열릴 때 한 번만 자동 제안
  useEffect(() => {
    if (!isOpen || !autoSuggestVariables || !editPrompt || editPrompt.id) return;
    if (autoRanFor.current === editPrompt) return;
    autoRanFor.current = editPrompt;
    if (extractVariables(editPrompt.content).length === 0) void handleSuggestVariables(editPrompt.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoSuggestVariables, editPrompt]);

  const applyPickedVariables = () => {
    if (!varSuggestions) return;
    setContent((prev) => applyVariables(prev, varSuggestions.filter((s) => s.checked)));
    setVarSuggestions(null);
  };

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
    setVarSuggestions(null);
    setVarMessage("");
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
              {editPrompt?.id ? "프롬프트 템플릿 수정" : "새 프롬프트 만들기"}
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
                {onSuggestVariables && (
                  <button
                    type="button"
                    disabled={loadingField !== null || !content.trim()}
                    onClick={() => handleSuggestVariables(content)}
                    className="flex items-center gap-1 text-[11px] font-bold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-2 py-0.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                    title="본문에서 쓸 때마다 바뀌는 부분을 찾아 {{변수}}로 바꾸자고 제안"
                  >
                    {loadingField === "variables" ? <Loader2 size={11} className="animate-spin" /> : <span>🪄</span>}
                    <span>변수 찾기</span>
                  </button>
                )}
              </div>
            </div>

            {/* 🪄 변수 제안 (2026-10-21 v1.08) */}
            {loadingField === "variables" && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-violet-200 bg-violet-50 text-[11px] font-bold text-violet-800">
                <Loader2 size={13} className="animate-spin" />
                AI가 쓸 때마다 바뀌는 부분을 찾고 있습니다…
              </div>
            )}
            {varSuggestions && varSuggestions.length > 0 && (
              <div className="p-3.5 rounded-xl border border-violet-200 bg-violet-50 space-y-2">
                <p className="text-[11px] font-bold text-violet-900">
                  🪄 바뀌는 부분을 {"{{변수}}"}로 바꾸면 다음부터 값만 넣어 바로 실행할 수 있습니다. 바꿀 것만 골라 주세요.
                </p>
                <ul className="space-y-1">
                  {varSuggestions.map((s, i) => (
                    <li key={s.name}>
                      <label className="flex items-start gap-2 text-xs text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={s.checked}
                          onChange={(e) =>
                            setVarSuggestions((prev) => prev && prev.map((p, j) => (j === i ? { ...p, checked: e.target.checked } : p)))
                          }
                          className="mt-0.5 accent-violet-600"
                        />
                        <span className="min-w-0">
                          <code className="font-mono font-bold text-violet-700">{`{{${s.name}}}`}</code>
                          <span className="text-slate-500"> ← “{s.original}”</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setVarSuggestions(null)}
                    className="px-3 py-1.5 rounded-lg border border-violet-200 bg-white text-[11px] font-bold text-violet-700 hover:bg-violet-100 cursor-pointer"
                  >
                    그대로 둘게요
                  </button>
                  <button
                    type="button"
                    disabled={!varSuggestions.some((s) => s.checked)}
                    onClick={applyPickedVariables}
                    className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                  >
                    선택한 것 변수로 바꾸기
                  </button>
                </div>
              </div>
            )}
            {varMessage && <p className="text-[11px] text-slate-500">{varMessage}</p>}

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
              <span>{editPrompt?.id ? "수정 완료" : "템플릿 저장"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
