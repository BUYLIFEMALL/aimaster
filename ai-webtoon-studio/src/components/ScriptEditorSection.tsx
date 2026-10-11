"use client";

import React, { useState } from "react";
import {
  ListOrdered,
  Minus,
  Plus,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileCode2,
  Eye,
} from "lucide-react";
import { WebtoonProject } from "@/lib/types";
import { generateStoryboardAI } from "@/lib/gemini";

interface ScriptEditorSectionProps {
  project: WebtoonProject;
  onChangeProject: (updated: Partial<WebtoonProject>) => void;
  apiKey: string;
  onOpenSettings: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
}

export function ScriptEditorSection({
  project,
  onChangeProject,
  apiKey,
  onOpenSettings,
  onNextStep,
  onPrevStep,
}: ScriptEditorSectionProps) {
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "raw">("cards");

  const handleGenerateScript = async () => {
    if (!apiKey) {
      alert("시나리오 콘티 생성을 위해 먼저 [API키등록·플랫폼연동]에서 Gemini API 키를 등록해주세요.");
      onOpenSettings();
      return;
    }

    setIsGeneratingScript(true);
    try {
      const { scriptText, cuts } = await generateStoryboardAI(apiKey, project);
      onChangeProject({
        scriptText,
        cuts,
      });
    } catch (e: any) {
      alert(e.message || "스토리 콘티 생성에 실패했습니다.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleUpdateCutDialogue = (index: number, newDialogue: string) => {
    const updated = [...(project.cuts || [])];
    if (updated[index]) {
      updated[index] = { ...updated[index], dialogue: newDialogue };
      onChangeProject({ cuts: updated });
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
            3
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              시나리오 & 컷별 콘티 생성기 (STEP 3)
            </h2>
            <p className="text-xs text-slate-500">
              화수와 컷수를 설정하고, 스토리 추가 연출 요청을 입력하여 컷별 지문·구도·대사 콘티를 자동 생성합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: 제어 패널 */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-6 space-y-5 shadow-2xs h-fit">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ListOrdered className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              // 시나리오 편집기
            </h3>
          </div>

          {/* 챕터 수 & 장(컷) 수 카운터 (2열) */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* 챕터 수 */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500">챕터 수 (화)</span>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    onChangeProject({
                      chapterCount: Math.max(1, (project.chapterCount || 1) - 1),
                    })
                  }
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-black text-slate-900">
                  {project.chapterCount || 1} 화
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChangeProject({
                      chapterCount: Math.min(10, (project.chapterCount || 1) + 1),
                    })
                  }
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 장 수 (컷 수) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500">장 수 (컷 수)</span>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    onChangeProject({
                      cutCount: Math.max(1, (project.cutCount || 4) - 1),
                    })
                  }
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-black text-slate-900">
                  {project.cutCount || 4} 컷
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChangeProject({
                      cutCount: Math.min(10, (project.cutCount || 4) + 1),
                    })
                  }
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 스토리 추가 요청 (Textarea) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              스토리 추가 요청 (예: 반전 추가, 클라이맥스 연출 등)
            </label>
            <textarea
              rows={4}
              value={project.storyPrompt}
              onChange={(e) => onChangeProject({ storyPrompt: e.target.value })}
              placeholder="예: 마지막 컷에서 엄청난 반전이 일어나며 독자의 호기심을 극대화하는 클리프행어로 연출해주세요."
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-slate-50/50 leading-relaxed"
            />
          </div>

          {/* 메인 생성 버튼 (초록색 버튼) */}
          <button
            type="button"
            onClick={handleGenerateScript}
            disabled={isGeneratingScript}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black transition shadow-xs cursor-pointer"
          >
            {isGeneratingScript ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>
              {isGeneratingScript
                ? "시나리오 콘티 생성 중..."
                : `총 ${project.chapterCount || 1}화 (${project.cutCount || 4}컷) 스토리 생성`}
            </span>
          </button>
        </div>

        {/* Right 7 Cols: 콘티 결과 뷰어 & 에디터 */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4 shadow-2xs">
          {/* Header & View Mode Switcher */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800">
                콘티 결과 ({project.cuts?.length || 0}컷 생성됨)
              </span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>컷별 카드 뷰</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("raw")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                  viewMode === "raw"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileCode2 className="w-3 h-3" />
                <span>텍스트 원문 뷰</span>
              </button>
            </div>
          </div>

          {/* Cards View */}
          {viewMode === "cards" ? (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {project.cuts && project.cuts.length > 0 ? (
                project.cuts.map((cut, idx) => (
                  <div
                    key={cut.cutIndex || idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-black bg-slate-900 text-white rounded-md">
                          CUT #{cut.cutIndex}
                        </span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {cut.cameraAngle}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        {cut.characterNames?.join(", ") || "배경/독백"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-normal">
                      <span className="font-bold text-slate-900">[연출]</span> {cut.description}
                    </p>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">
                        대사 / 말풍선 내용 (직접 수정 가능)
                      </label>
                      <input
                        type="text"
                        value={cut.dialogue}
                        onChange={(e) => handleUpdateCutDialogue(idx, e.target.value)}
                        placeholder="대사가 없는 장면은 비워두세요."
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-white"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <p className="text-xs font-bold text-slate-600">아직 생성된 콘티가 없습니다.</p>
                  <p className="text-[11px]">
                    좌측의 [총 {project.chapterCount || 1}화 ({project.cutCount || 4}컷) 스토리 생성] 버튼을 클릭하세요.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Raw Text View */
            <textarea
              rows={16}
              value={project.scriptText || ""}
              onChange={(e) => onChangeProject({ scriptText: e.target.value })}
              placeholder="스토리 콘티 생성 시 원문이 여기에 표시되며 자유롭게 직접 수정할 수 있습니다."
              className="w-full p-3.5 text-xs font-mono border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-slate-50/50 leading-relaxed"
            />
          )}

          {/* Navigation Step Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onPrevStep}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>이전: 캐릭터 설정</span>
            </button>
            <button
              type="button"
              onClick={onNextStep}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <span>다음: 웹툰 제작 & 뷰어 (STEP 4)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
