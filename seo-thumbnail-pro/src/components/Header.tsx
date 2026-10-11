"use client";

import React, { useRef } from "react";
import { Sparkles, Download, Upload, HelpCircle, Settings, Key } from "lucide-react";
import { APP_VERSION, PROGRAM_NAME } from "@/lib/version";

interface HeaderProps {
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
  onOpenGuideModal: () => void;
  onExportProject: () => void;
  onImportProject: (file: File) => void;
}

export default function Header({
  hasApiKey,
  onOpenApiKeyModal,
  onOpenGuideModal,
  onExportProject,
  onImportProject,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportProject(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-900 tracking-tight text-lg">
                {PROGRAM_NAME}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {APP_VERSION}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              AI 기반 유튜브 대본 A/B 전략 분석 & 16:9 고화질 썸네일 올인원 제작 솔루션
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* JSON Export/Import */}
          <button
            onClick={onExportProject}
            title="프로젝트 전체 설정 JSON으로 백업"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            백업 내보내기
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="백업된 JSON 불러오기"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            불러오기
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          {/* Guide Modal */}
          <button
            onClick={onOpenGuideModal}
            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="사용 가이드 및 팁"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* API Key Modal */}
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shadow-xs ${
              hasApiKey
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "bg-amber-500 text-white hover:bg-amber-600 animate-bounce"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Gemini API 키</span>
            <span
              className={`w-2 h-2 rounded-full ${
                hasApiKey ? "bg-emerald-400" : "bg-white"
              }`}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
