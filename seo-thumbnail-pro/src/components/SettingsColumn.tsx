"use client";

import React, { useState, useRef } from "react";
import {
  Sliders,
  Type,
  KeyRound,
  Video,
  Smile,
  User,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Terminal,
} from "lucide-react";
import {
  ThumbnailSettings,
  GENRE_OPTIONS,
  MOOD_OPTIONS,
  RACE_OPTIONS,
  AGE_OPTIONS,
  GENDER_OPTIONS,
} from "@/types/thumbnail";
import { buildThumbnailPrompt } from "@/lib/gemini";

interface SettingsColumnProps {
  settings: ThumbnailSettings;
  onSettingsChange: (settings: ThumbnailSettings) => void;
}

export default function SettingsColumn({
  settings,
  onSettingsChange,
}: SettingsColumnProps) {
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateSubject = (partial: Partial<ThumbnailSettings["subject"]>) => {
    onSettingsChange({
      ...settings,
      subject: {
        ...settings.subject,
        ...partial,
      },
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        updateSubject({ image: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    updateSubject({ image: undefined });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const currentPrompt = buildThumbnailPrompt(settings);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(currentPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 flex flex-col gap-5">
      {/* Step Header */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
          2
        </div>
        <div className="flex items-center gap-1.5 text-slate-900 font-bold text-base">
          <Sliders className="w-5 h-5 text-indigo-600" />
          <h2>썸네일 상세 설정</h2>
        </div>
      </div>

      <div className="space-y-4">
        {/* Title Input */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            <Type className="w-3.5 h-3.5 text-slate-500" />
            썸네일 제목 (문구)
          </label>
          <input
            type="text"
            value={settings.title}
            onChange={(e) => onSettingsChange({ ...settings, title: e.target.value })}
            placeholder="썸네일에 들어갈 짧고 강렬한 핵심 문구"
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Keywords Input */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            핵심 비주얼 키워드
          </label>
          <input
            type="text"
            value={settings.keywords}
            onChange={(e) => onSettingsChange({ ...settings, keywords: e.target.value })}
            placeholder="예: 화려한 무대, 네온 조명, 도시 야경, 상승하는 주가 그래프"
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Genre & Mood Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              <Video className="w-3.5 h-3.5 text-slate-500" />
              장르
            </label>
            <select
              value={settings.genre}
              onChange={(e) => onSettingsChange({ ...settings, genre: e.target.value })}
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all cursor-pointer text-slate-800"
            >
              {GENRE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              <Smile className="w-3.5 h-3.5 text-slate-500" />
              분위기
            </label>
            <select
              value={settings.mood}
              onChange={(e) => onSettingsChange({ ...settings, mood: e.target.value })}
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all cursor-pointer text-slate-800"
            >
              {MOOD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Subject (Person) Settings Box */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-900">피사체 (인물) 설정</span>
            </div>
            {/* Toggle switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.subject.include}
                onChange={(e) => updateSubject({ include: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {settings.subject.include && (
            <div className="mt-2.5 space-y-3.5 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl animate-in fade-in duration-150">
              {/* Race, Age, Gender dropdowns */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">인종/국적</label>
                  <select
                    value={settings.subject.race}
                    onChange={(e) => updateSubject({ race: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none cursor-pointer"
                  >
                    {RACE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">연령대</label>
                  <select
                    value={settings.subject.age}
                    onChange={(e) => updateSubject({ age: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none cursor-pointer"
                  >
                    {AGE_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">성별</label>
                  <select
                    value={settings.subject.gender}
                    onChange={(e) => updateSubject({ gender: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none cursor-pointer"
                  >
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Character Details */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  인물의 특징 (표정, 동작, 의상)
                </label>
                <input
                  type="text"
                  value={settings.subject.description}
                  onChange={(e) => updateSubject({ description: e.target.value })}
                  placeholder="예: 입을 크게 벌리고 놀란 표정, 안경을 쓴 정장 차림"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none"
                />
              </div>

              {/* Reference Image Upload */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  레퍼런스 이미지 (선택)
                </label>
                {settings.subject.image ? (
                  <div className="relative inline-block border border-slate-300 rounded-lg overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={settings.subject.image}
                      alt="Reference"
                      className="w-24 h-24 object-cover"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                      title="이미지 제거"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-3 text-center cursor-pointer bg-white transition-colors"
                  >
                    <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                    <p className="text-[11px] text-slate-500">
                      클릭하여 참조할 인물 사진 업로드
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Prompt Preview Accordion */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setIsPromptOpen(!isPromptOpen)}
            className="w-full flex items-center justify-between text-left py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <span>생성 프롬프트 상세 (실시간)</span>
            </div>
            {isPromptOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {isPromptOpen && (
            <div className="mt-2 space-y-2 animate-in fade-in duration-150">
              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                {currentPrompt}
              </div>
              <button
                onClick={handleCopyPrompt}
                className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPrompt ? "복사됨!" : "프롬프트 복사하기"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
