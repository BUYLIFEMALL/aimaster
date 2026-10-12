"use client";

import React, { useState } from "react";
import {
  Music,
  Activity,
  Zap,
  ShieldCheck,
  Layers,
  FileMusic,
  Copy,
  Check,
  Sliders,
  Radio,
  Sparkles,
  Disc,
  AlertCircle,
} from "lucide-react";
import { MusicAnalysisResult } from "@/lib/types";

interface MusicReportViewProps {
  data: MusicAnalysisResult;
  onReset: () => void;
}

export default function MusicReportView({ data, onReset }: MusicReportViewProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedLyrics, setCopiedLyrics] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(data.sunoAiPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyLyrics = () => {
    navigator.clipboard.writeText(data.lyricTranscription);
    setCopiedLyrics(true);
    setTimeout(() => setCopiedLyrics(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. 상단 핵심 음악 메타 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
            <Disc size={14} className="text-purple-600" />
            <span>장르 & 스타일</span>
          </div>
          <div className="text-lg font-extrabold text-slate-900 truncate">
            {data.overview.genre || "미정"}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            분위기: {data.overview.mood}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
            <Activity size={14} className="text-indigo-600" />
            <span>BPM & 템포</span>
          </div>
          <div className="text-xl font-extrabold text-indigo-700 font-mono">
            {data.rhythmAndTempo.bpm || 120} <span className="text-xs font-normal text-slate-400">BPM</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            박자: {data.rhythmAndTempo.timeSignature || "4/4"}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
            <FileMusic size={14} className="text-blue-600" />
            <span>Key & Scale (조성)</span>
          </div>
          <div className="text-lg font-extrabold text-slate-900">
            {data.harmonyAndKey.key || "C"} {data.harmonyAndKey.scale || "Major"}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            코드: {data.harmonyAndKey.chordProgression}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
            <Radio size={14} className="text-emerald-600" />
            <span>기술 사양</span>
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {data.technicalSpecs.duration || "측정 완료"}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {data.technicalSpecs.sampleRate || "44.1kHz"} · {data.technicalSpecs.channels || "Stereo"}
          </p>
        </div>
      </div>

      {/* 2. 🔥 Suno AI v5 Reverse Prompt (하이라이트 카드) */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-700/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold shadow-sm">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight flex items-center gap-2">
                <span>Suno AI v5 역설계 프롬프트 (God Tier)</span>
                <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                  Reverse Prompt
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                음원을 나노 단위로 분석하여 Suno AI v5에서 동일한 분위기를 재현하도록 역설계된 프롬프트입니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyPrompt}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md active:scale-95 shrink-0"
          >
            {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedPrompt ? "복사 완료!" : "프롬프트 복사"}</span>
          </button>
        </div>

        <div className="p-4 bg-black/40 rounded-2xl border border-white/10 font-mono text-xs leading-relaxed text-indigo-100 whitespace-pre-wrap select-text">
          {data.sunoAiPrompt}
        </div>
      </div>

      {/* 3. 오디오 포렌식 & 품질 분석 카드 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-600" />
            <span>음향 포렌식 & 위변조 품질 분석</span>
          </h3>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              data.forensicAnalysis.isUpscaled
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {data.forensicAnalysis.isUpscaled ? "⚠️ 뻥튀기(Upscaled) 의심" : "✅ 순정 원본 추정"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">추정 소스 품질</span>
            <span className="font-bold text-slate-800">{data.forensicAnalysis.compressionQuality}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">의심 원본 소스</span>
            <span className="font-bold text-slate-800">{data.forensicAnalysis.suspectedSource}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">편집 흔적 탐지</span>
            <span className="font-bold text-slate-800">{data.forensicAnalysis.editTraces}</span>
          </div>
        </div>
      </div>

      {/* 4. 4대 스템 청각 묘사 (Stem Separation Insights) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Layers size={16} className="text-indigo-600" />
          <span>4대 스템(Stem) 음향 분리 묘사</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5">
            <div className="font-bold text-indigo-700 flex items-center gap-1.5">
              <span>🎤 Vocals</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {data.stemAnalysis.vocals}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5">
            <div className="font-bold text-blue-700 flex items-center gap-1.5">
              <span>🎸 Bass</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {data.stemAnalysis.bass}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5">
            <div className="font-bold text-purple-700 flex items-center gap-1.5">
              <span>🥁 Drums</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {data.stemAnalysis.drums}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5">
            <div className="font-bold text-emerald-700 flex items-center gap-1.5">
              <span>🎹 Others (Keys/Synth)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {data.stemAnalysis.others}
            </p>
          </div>
        </div>
      </div>

      {/* 5. 곡 구조 분석 & 채보 데이터 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 곡 구조 타임라인 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Activity size={16} className="text-indigo-600" />
            <span>시각적 곡 구조 분석 (Structure)</span>
          </h3>

          <div className="space-y-2 pt-1 text-xs">
            {data.structuralAnalysis.map((s, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-3">
                <span className="font-bold text-indigo-700 font-mono shrink-0 w-24 pt-0.5">
                  {s.section}
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed flex-1">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 작곡 및 채보 데이터 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <FileMusic size={16} className="text-blue-600" />
            <span>작곡 및 채보 데이터 (Notation & Chord Sheet)</span>
          </h3>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text">
            {data.composition.musicalNotation || data.harmonyAndKey.chordProgression}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="text-[10px] text-slate-400 font-bold block">비트 그리드 느낌</span>
              <span className="font-semibold text-slate-700 text-[11px]">{data.composition.beatGrid}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="text-[10px] text-slate-400 font-bold block">박자 기호</span>
              <span className="font-semibold text-slate-700 text-[11px]">{data.composition.timeSignature}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. 가사 전사 (Lyric Transcription) */}
      {data.lyricTranscription && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-600" />
              <span>가사 전사 (Lyric Transcription)</span>
            </h3>

            <button
              type="button"
              onClick={handleCopyLyrics}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            >
              {copiedLyrics ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>가사 복사</span>
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto custom-scrollbar select-text">
            {data.lyricTranscription}
          </div>
        </div>
      )}

      {/* 7. 스타일 및 사운드 심층 분석 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          스타일 및 편곡 사운드 심층 분석
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-slate-700">보컬 스타일:</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">{data.stylisticAnalysis.vocalStyle}</p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-slate-700">악기 연주 기법:</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">{data.stylisticAnalysis.instrumentalTechniques}</p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-slate-700">사운드 질감 (Texture):</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">{data.stylisticAnalysis.soundTexture}</p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-slate-700">편곡 디테일:</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">{data.stylisticAnalysis.arrangementDetails}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
