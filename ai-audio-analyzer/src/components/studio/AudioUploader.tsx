"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, Music, Mic, Sparkles, FileAudio, Trash2, Loader2, ArrowRight } from "lucide-react";
import WaveformCanvas from "./WaveformCanvas";
import { AnalysisMode } from "@/lib/types";

interface AudioUploaderProps {
  onAnalyze: (file: File, mode: AnalysisMode, context: string, specialRequest: string) => void;
  loading: boolean;
  selectedMode: AnalysisMode;
  onSelectMode: (mode: AnalysisMode) => void;
}

export default function AudioUploader({
  onAnalyze,
  loading,
  selectedMode,
  onSelectMode,
}: AudioUploaderProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [context, setContext] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|aac|flac|ogg|wma)$/i.test(file.name)) {
      setError("오디오 파일(mp3, wav, m4a, flac, ogg 등)만 지원됩니다.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("오디오 파일 크기는 25MB 이하를 권장합니다.");
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    const url = URL.createObjectURL(file);
    setAudioFile(file);
    setAudioUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) {
      setError("분석할 오디오 파일을 먼저 업로드해주세요.");
      return;
    }
    onAnalyze(audioFile, selectedMode, context.trim(), specialRequest.trim());
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 헤더 히어로 */}
      <div className="text-center space-y-2 py-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] text-xs font-bold">
          <Sparkles size={13} className="text-[#00f0ff]" />
          <span>Gemini 멀티모달 오디오 딥러닝 랩</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          소리의 숨겨진 의미를 <span className="text-[#00f0ff]">정밀 해체하세요</span>
        </h2>
        <p className="text-slate-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
          대화 음성의 맥락부터 음악의 화성학 및 음향 포렌식까지.
          <br />
          전문가 수준의 오디오 인사이트와 비즈니스 문서를 몇 초 만에 제공합니다.
        </p>
      </div>

      {/* 모드 선택 탭 버튼 바 */}
      <div className="bg-[#080d19] p-1 rounded-xl border border-[#1a2333] flex items-center gap-1 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => onSelectMode("auto")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            selectedMode === "auto"
              ? "bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles size={13} />
          <span>스마트 자동 감지</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode("speech")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            selectedMode === "speech"
              ? "bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Mic size={13} />
          <span>음성 · 회의록</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode("music")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            selectedMode === "music"
              ? "bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Music size={13} />
          <span>음악 · Suno v5</span>
        </button>
      </div>

      {/* 파일 업로드 드롭존 */}
      {!audioFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-[#00f0ff] bg-[#00f0ff]/10 scale-[1.01]"
              : "border-[#1a2333] bg-[#0a0e19] hover:border-[#00f0ff]/40 hover:bg-[#0c1324]"
          } shadow-lg`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
            <UploadCloud size={28} />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            오디오 파일을 여기에 드래그하세요
          </h3>
          <p className="text-xs text-slate-400 mb-3">또는 클릭하여 내 컴퓨터에서 탐색</p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
            <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">MP3</span>
            <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">WAV</span>
            <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">M4A</span>
            <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">FLAC</span>
            <span className="text-slate-500">최대 25MB</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 파형 캔버스 및 플레이어 */}
          <WaveformCanvas audioUrl={audioUrl} fileName={audioFile.name} />

          {/* 파일 정보 및 초기화 */}
          <div className="bg-[#0a0e19] rounded-xl p-3 border border-[#1a2333] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <FileAudio className="text-[#00f0ff] w-4 h-4 shrink-0" />
              <div>
                <span className="font-bold text-slate-200">{audioFile.name}</span>
                <span className="text-slate-400 ml-2">({formatFileSize(audioFile.size)})</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-red-400 flex items-center gap-1 font-medium transition-colors"
            >
              <Trash2 size={13} />
              <span>파일 교체</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-500/40 text-red-300 text-xs rounded-xl flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      {/* 부가 입력 폼: 컨텍스트 및 특별 요청 */}
      <div className="bg-[#0a0e19] rounded-2xl p-5 border border-[#1a2333] shadow-md space-y-4 text-xs">
        <div>
          <label className="block font-bold text-slate-300 mb-1.5">
            사용자 컨텍스트 (선택 사항)
          </label>
          <input
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="예: 주간 마케팅 전략 회의, K-POP 발라드 음원 데모, 1:1 심층 인터뷰 등"
            className="w-full px-3.5 py-2.5 bg-[#060911] border border-[#1a2333] rounded-xl focus:outline-hidden focus:border-[#00f0ff] text-xs text-slate-200 placeholder-slate-600 transition"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-300 mb-1.5">
            특별 요청 사항 (선택 사항)
          </label>
          <input
            type="text"
            value={specialRequest}
            onChange={(e) => setSpecialRequest(e.target.value)}
            placeholder="예: 화자 B의 반대 의견을 중점 분석해줘, Suno v5 역설계 프롬프트와 코드 진행에 집중해줘"
            className="w-full px-3.5 py-2.5 bg-[#060911] border border-[#1a2333] rounded-xl focus:outline-hidden focus:border-[#00f0ff] text-xs text-slate-200 placeholder-slate-600 transition"
          />
        </div>
      </div>

      {/* 분석 실행 버튼 */}
      <button
        type="button"
        disabled={loading || !audioFile}
        onClick={handleSubmit}
        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#7000ff] hover:opacity-95 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.25)] active:scale-[0.99] cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>AI 멀티모달 분석 엔진 가동 중 (수 초 소요)...</span>
          </>
        ) : (
          <>
            <span>오디오 분석 시작하기</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}
