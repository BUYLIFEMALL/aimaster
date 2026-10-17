"use client";

import React, { useState, useRef } from "react";
import {
  User,
  Plus,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  Upload,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { CharacterInfo, WebtoonProject } from "@/lib/types";
import { expandCharacterAI } from "@/lib/gemini";
import { generateCharacterSheetImage } from "@/lib/imageGen";

interface CharacterSectionProps {
  project: WebtoonProject;
  onChangeProject: (updated: Partial<WebtoonProject>) => void;
  apiKey: string;
  onOpenSettings: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
}

export function CharacterSection({
  project,
  onChangeProject,
  apiKey,
  onOpenSettings,
  onNextStep,
  onPrevStep,
}: CharacterSectionProps) {
  const [selectedCharIndex, setSelectedCharIndex] = useState(0);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const characters = project.characters || [];
  const activeChar = characters[selectedCharIndex] || characters[0];

  const handleUpdateActiveChar = (updates: Partial<CharacterInfo>) => {
    const updatedChars = [...characters];
    updatedChars[selectedCharIndex] = {
      ...activeChar,
      ...updates,
    };
    onChangeProject({ characters: updatedChars });
  };

  const handleAddCharacter = () => {
    if (characters.length >= 3) {
      alert("등장인물은 최대 3명까지 등록할 수 있습니다.");
      return;
    }
    const newChar: CharacterInfo = {
      id: `char-${Date.now()}`,
      name: `인물 ${characters.length + 1}`,
      description: "20대 초반, 밝은 갈색 웨이브 헤어, 캐주얼한 스트리트 패션, 활기찬 미소",
    };
    onChangeProject({ characters: [...characters, newChar] });
    setSelectedCharIndex(characters.length);
  };

  const handleDeleteCharacter = (idx: number) => {
    if (characters.length <= 1) {
      alert("최소 1명 이상의 등장인물이 필요합니다.");
      return;
    }
    const filtered = characters.filter((_, i) => i !== idx);
    onChangeProject({ characters: filtered });
    setSelectedCharIndex(Math.max(0, idx - 1));
  };

  // 1. 캐릭터 묘사 AI 확장 마법봉
  const handleExpandCharacter = async () => {
    if (!apiKey) {
      alert("캐릭터 묘사 확장을 위해 먼저 [API키등록·플랫폼연동]에서 Gemini API 키를 등록해주세요.");
      onOpenSettings();
      return;
    }

    setIsExpanding(true);
    try {
      const expanded = await expandCharacterAI(
        apiKey,
        activeChar.name,
        activeChar.description,
        project.artStyle
      );
      handleUpdateActiveChar({ description: expanded });
    } catch (e: any) {
      alert(e.message || "캐릭터 묘사 확장에 실패했습니다.");
    } finally {
      setIsExpanding(false);
    }
  };

  // 2. 캐릭터 시트 생성
  const handleGenerateSheet = async () => {
    setIsGeneratingSheet(true);
    try {
      let fallbackReason = "";
      const sheetUrl = await generateCharacterSheetImage(
        apiKey,
        activeChar,
        project.artStyle,
        (reason) => { fallbackReason = reason; }
      );
      handleUpdateActiveChar({ characterSheetUrl: sheetUrl });
      if (fallbackReason) alert(`AI(Gemini) 그림 생성에 실패해 무료 대체 그림을 넣었습니다. 원인: ${fallbackReason}`);
    } catch (e: any) {
      alert(e.message || "캐릭터 시트 생성에 실패했습니다.");
    } finally {
      setIsGeneratingSheet(false);
    }
  };

  // 3. 로컬 참조 사진 업로드
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      handleUpdateActiveChar({ referenceImageUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Section Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            2
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              캐릭터 설정 & 일관성 시트 (STEP 2)
            </h2>
            <p className="text-xs text-slate-500">
              등장인물(최대 3명)의 외형을 정의하고, 턴어라운드 캐릭터 시트 또는 보유 사진을 등록합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Main Character Config Box */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-5 shadow-2xs">
        {/* Header & Character Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              // 캐릭터 설정 (최대 3명)
            </h3>
          </div>

          {/* Character Selector Tabs */}
          <div className="flex items-center gap-2">
            {characters.map((c, i) => (
              <button
                key={c.id || i}
                type="button"
                onClick={() => setSelectedCharIndex(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedCharIndex === i
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{c.name || `인물 ${i + 1}`}</span>
              </button>
            ))}

            {characters.length < 3 && (
              <button
                type="button"
                onClick={handleAddCharacter}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 text-slate-600 text-xs font-bold transition cursor-pointer"
                title="등장인물 추가 (최대 3명)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>추가</span>
              </button>
            )}
          </div>
        </div>

        {/* Character Detail Form & Preview Canvas (2열 레이아웃) */}
        {activeChar && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input Form */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-3">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    인물 이름
                  </label>
                  <input
                    type="text"
                    value={activeChar.name}
                    onChange={(e) => handleUpdateActiveChar({ name: e.target.value })}
                    placeholder="인물 이름을 입력하세요"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                  />
                </div>
                {characters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCharacter(selectedCharIndex)}
                    className="mt-5 p-2 rounded-xl text-rose-500 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                    title="이 인물 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 외형 묘사 텍스트에어리어 + AI 마법봉 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    등장인물 외형 묘사 (옷, 머리색 등) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleExpandCharacter}
                    disabled={isExpanding}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition disabled:opacity-50 cursor-pointer"
                    title="AI가 웹툰 일관성에 적합한 고유 외형 묘사를 디테일하게 보강합니다."
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isExpanding ? "AI 확장 중..." : "AI 외형 묘사 추천"}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={activeChar.description}
                  onChange={(e) => handleUpdateActiveChar({ description: e.target.value })}
                  placeholder="예: 19세 고등학생 소년, 단정한 검은 숏컷 머리, 네이비 교복 셔츠와 슬랙스, 호기심 가득하고 결단력 있는 눈빛"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 leading-relaxed"
                />
              </div>

              {/* Action Buttons: 캐릭터 시트 생성 & 이미지 불러오기 */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleGenerateSheet}
                  disabled={isGeneratingSheet}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  {isGeneratingSheet ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isGeneratingSheet ? "시트 생성 중..." : "캐릭터 시트 생성"}</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>이미지 불러오기</span>
                </button>
              </div>
            </div>

            {/* Right: Character Preview Canvas Box */}
            <div className="flex flex-col">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                캐릭터 비주얼 프리뷰 (시트 또는 참조 이미지)
              </label>
              <div className="flex-1 min-h-[220px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden relative group">
                {activeChar.characterSheetUrl || activeChar.referenceImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeChar.characterSheetUrl || activeChar.referenceImageUrl}
                    alt={activeChar.name}
                    className="w-full h-full object-contain max-h-[300px]"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2 text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-slate-300 shadow-2xs">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-600">등록된 캐릭터 이미지가 없습니다.</p>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      [캐릭터 시트 생성]을 클릭하여 3면 턴어라운드를 생성하거나, [이미지 불러오기]로 보유 사진을 등록하세요.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Step Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onPrevStep}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>이전: 기획 & 컨셉</span>
          </button>
          <button
            type="button"
            onClick={onNextStep}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <span>다음: 시나리오 콘티 생성 (STEP 3)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
