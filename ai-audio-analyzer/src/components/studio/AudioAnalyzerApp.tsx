"use client";

import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AudioUploader from "./AudioUploader";
import SpeechReportView from "./SpeechReportView";
import MusicReportView from "./MusicReportView";
import ApiKeyModal from "@/components/settings/ApiKeyModal";
import GuideModal from "@/components/guide/GuideModal";
import { AnalysisMode, AnalysisResult } from "@/lib/types";

interface AudioAnalyzerAppProps {
  initialUserEmail?: string | null;
}

export default function AudioAnalyzerApp({ initialUserEmail }: AudioAnalyzerAppProps) {
  const [userEmail] = useState<string | null>(initialUserEmail || null);
  const [selectedMode, setSelectedMode] = useState<AnalysisMode>("auto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 모달 상태
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const handleAnalyze = async (
    file: File,
    mode: AnalysisMode,
    context: string,
    specialRequest: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      if (context) formData.append("context", context);
      if (specialRequest) formData.append("specialRequest", specialRequest);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needKey) {
          setIsApiKeyOpen(true);
        }
        throw new Error(data.error || "오디오 분석에 실패했습니다.");
      }

      setResult({
        mode: data.mode,
        data: data.data,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
      setError(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* 1. 좌측 표준 사이드바 */}
      <Sidebar
        userEmail={userEmail}
        selectedMode={selectedMode}
        onSelectMode={(m) => {
          setSelectedMode(m);
          if (result) {
            // 모드를 직접 전환했을 때 결과 초기화 여부
          }
        }}
        onOpenApiKey={() => setIsApiKeyOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        hasResult={!!result}
      />

      {/* 2. 중앙 메인 작업 영역 */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* 상단 얇은 상태 바 */}
        <header className="h-12 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>AI Audio 분석 스튜디오 온라인</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">
              현재 모드: {selectedMode === "auto" ? "스마트 자동 감지" : selectedMode === "speech" ? "음성 인텔리전스" : "음악 & Suno v5"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {result && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                + 새 파일 분석
              </button>
            )}
          </div>
        </header>

        {/* 메인 스크롤 콘텐츠 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-6xl mx-auto">
            {/* 결과가 없을 때: 업로더 */}
            {!result ? (
              <AudioUploader
                onAnalyze={handleAnalyze}
                loading={loading}
                selectedMode={selectedMode}
                onSelectMode={setSelectedMode}
              />
            ) : result.mode === "speech" ? (
              /* 음성 분석 결과 뷰 */
              <SpeechReportView
                data={result.data}
                onReset={handleReset}
              />
            ) : (
              /* 음악 분석 결과 뷰 */
              <MusicReportView
                data={result.data}
                onReset={handleReset}
              />
            )}
          </div>
        </div>
      </main>

      {/* 3. 모달 팝업들 */}
      <ApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
