"use client";

import React, { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import AudioUploader from "./AudioUploader";
import SpeechReportView from "./SpeechReportView";
import MusicReportView from "./MusicReportView";
import ApiKeyModal from "@/components/settings/ApiKeyModal";
import GuideModal from "@/components/guide/GuideModal";
import { AnalysisMode, AnalysisResult } from "@/lib/types";
import { APP_VERSION } from "@/lib/version";

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
    <div className="flex h-screen bg-[#060911] text-slate-100 overflow-hidden font-sans">
      {/* 1. 좌측 사이버 네온 다크 사이드바 */}
      <Sidebar
        userEmail={userEmail}
        selectedMode={selectedMode}
        onSelectMode={(m) => {
          setSelectedMode(m);
          if (result) {
            // 모드를 직접 전환했을 때 필요시 초기화
          }
        }}
        onOpenApiKey={() => setIsApiKeyOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        hasResult={!!result}
      />

      {/* 2. 중앙 메인 작업 영역 */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* 상단 다크 콘솔 상태 바 */}
        <header className="h-14 border-b border-[#1a2333] bg-[#0a0e19] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse" />
            <span className="text-white font-bold">AI Audio 분석 스튜디오 온라인</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-mono text-[11px]">
              엔진 모드:{" "}
              <strong className="text-[#00f0ff]">
                {selectedMode === "auto"
                  ? "스마트 자동 감지 (Auto)"
                  : selectedMode === "speech"
                  ? "음성 인텔리전스 (Speech)"
                  : "음악 분석 · Suno v5 (Music)"}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/guide"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-1.5 text-xs font-semibold text-[#f59e0b] hover:bg-[#f59e0b]/20 transition"
            >
              <span>📖</span>
              <span>사용 매뉴얼</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsApiKeyOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#00f0ff]/40 bg-[#00f0ff]/10 px-3 py-1.5 text-xs font-semibold text-[#00f0ff] hover:bg-[#00f0ff]/20 transition"
            >
              <span>🔑</span>
              <span>API 키 설정</span>
            </button>

            {result && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-bold text-white bg-gradient-to-r from-[#00f0ff] to-[#7000ff] px-3.5 py-1.5 rounded-lg transition-all shadow-[0_0_12px_rgba(0,240,255,0.3)] hover:opacity-90"
              >
                + 새 파일 분석
              </button>
            )}
          </div>
        </header>

        {/* 메인 스크롤 콘텐츠 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* 결과가 없을 때 상단 히어로 배너 및 3대 KPI 카드 노출 */}
            {!result && (
              <>
                <div className="relative overflow-hidden rounded-2xl border border-[#00f0ff]/30 bg-gradient-to-br from-[#0c1324] via-[#080d19] to-[#04060b] p-6 shadow-[0_0_30px_rgba(0,240,255,0.1)]">
                  <div className="absolute right-0 top-0 -mr-12 -mt-12 h-56 w-56 rounded-full bg-[#00f0ff]/10 blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-1/3 -mb-12 h-40 w-40 rounded-full bg-[#7000ff]/10 blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-3 py-0.5 text-xs font-semibold text-[#00f0ff]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
                        v1.10 Cyber Neon Audio Intelligence Console
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                        🎙️ Gemini 2.5 Flash 멀티모달 오디오 인텔리전스
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                        음성 대화 회의록부터 Suno v5 음악 역설계, 고주파 위변조 포렌식까지.
                        WAV, MP3 음원을 드래그앤드롭하여 사운드를 초정밀 해체하세요.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <Link
                        href="/guide"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/15 px-4 py-2.5 text-xs font-bold text-[#f59e0b] hover:bg-[#f59e0b]/25 transition shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                      >
                        <span>📖</span> 사용 매뉴얼 보기
                      </Link>
                      <button
                        type="button"
                        onClick={() => setIsApiKeyOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#00f0ff]/40 bg-[#00f0ff]/15 px-4 py-2.5 text-xs font-bold text-[#00f0ff] hover:bg-[#00f0ff]/25 transition shadow-[0_0_12px_rgba(0,240,255,0.2)]"
                      >
                        <span>🔑</span> Gemini API 설정
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3대 핵심 KPI 지표 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-[#1a2333] bg-[#0d121f] p-4 flex items-center gap-3.5 hover:border-[#00f0ff]/40 transition">
                    <div className="w-10 h-10 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center text-lg shrink-0">
                      🤖
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">듀얼 멀티모달 AI 엔진</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">음성/음악 스마트 3초 자동 감지</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#1a2333] bg-[#0d121f] p-4 flex items-center gap-3.5 hover:border-emerald-500/40 transition">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0">
                      👥
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">화자 분리 & 마크다운 회의록</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">점유율, 액션 아이템, 원클릭 복사</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#1a2333] bg-[#0d121f] p-4 flex items-center gap-3.5 hover:border-purple-500/40 transition">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-lg shrink-0">
                      ✨
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Suno v5 역설계 & 음향 포렌식</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">God Tier 프롬프트, 4대 스템, 뻥튀기 감정</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 메인 뷰: 결과가 없을 때 업로더 / 있을 때 리포트 뷰 */}
            {!result ? (
              <div className="rounded-2xl border border-[#1a2333] bg-[#0d121f] p-6 shadow-xl">
                <AudioUploader
                  onAnalyze={handleAnalyze}
                  loading={loading}
                  selectedMode={selectedMode}
                  onSelectMode={setSelectedMode}
                />
              </div>
            ) : result.mode === "speech" ? (
              /* 음성 분석 결과 뷰 */
              <div className="rounded-2xl border border-[#1a2333] bg-[#0d121f] p-6 shadow-xl">
                <SpeechReportView
                  data={result.data}
                  onReset={handleReset}
                />
              </div>
            ) : (
              /* 음악 분석 결과 뷰 */
              <div className="rounded-2xl border border-[#1a2333] bg-[#0d121f] p-6 shadow-xl">
                <MusicReportView
                  data={result.data}
                  onReset={handleReset}
                />
              </div>
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
