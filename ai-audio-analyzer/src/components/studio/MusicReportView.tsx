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
  Radio,
  Sparkles,
  Disc,
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
      {/* 1. 상단 핵심 음악 메타 카드 (네온 다크 콘솔 KPI) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0a0e19]/90 p-4 rounded-2xl border border-[#162035] hover:border-[#00f0ff]/40 transition-colors shadow-lg">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
            <Disc size={14} className="text-[#00f0ff]" />
            <span>장르 & 스타일</span>
          </div>
          <div className="text-lg font-extrabold text-white truncate">
            {data.overview.genre || "미정"}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            분위기: <span className="text-slate-300">{data.overview.mood}</span>
          </p>
        </div>

        <div className="bg-[#0a0e19]/90 p-4 rounded-2xl border border-[#162035] hover:border-[#8b5cf6]/40 transition-colors shadow-lg">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
            <Activity size={14} className="text-[#8b5cf6]" />
            <span>BPM & 템포</span>
          </div>
          <div className="text-xl font-extrabold text-[#c084fc] font-mono">
            {data.rhythmAndTempo.bpm || 120} <span className="text-xs font-normal text-slate-400">BPM</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            박자: <span className="text-slate-300">{data.rhythmAndTempo.timeSignature || "4/4"}</span>
          </p>
        </div>

        <div className="bg-[#0a0e19]/90 p-4 rounded-2xl border border-[#162035] hover:border-[#38bdf8]/40 transition-colors shadow-lg">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
            <FileMusic size={14} className="text-[#38bdf8]" />
            <span>Key & Scale (조성)</span>
          </div>
          <div className="text-lg font-extrabold text-white">
            {data.harmonyAndKey.key || "C"} <span className="text-[#38bdf8]">{data.harmonyAndKey.scale || "Major"}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            코드: <span className="text-slate-300 font-mono">{data.harmonyAndKey.chordProgression}</span>
          </p>
        </div>

        <div className="bg-[#0a0e19]/90 p-4 rounded-2xl border border-[#162035] hover:border-[#10b981]/40 transition-colors shadow-lg">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
            <Radio size={14} className="text-[#10b981]" />
            <span>기술 사양</span>
          </div>
          <div className="text-sm font-bold text-white truncate">
            {data.technicalSpecs.duration || "측정 완료"}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {data.technicalSpecs.sampleRate || "44.1kHz"} · {data.technicalSpecs.channels || "Stereo"}
          </p>
        </div>
      </div>

      {/* 2. 🔥 Suno AI v5 Reverse Prompt (하이라이트 카드) */}
      <div className="bg-gradient-to-br from-[#0c1324] via-[#090d18] to-[#120f29] text-white rounded-3xl p-6 shadow-2xl border border-[#00f0ff]/40 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00f0ff]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#8b5cf6] text-[#060911] flex items-center justify-center font-extrabold shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <Zap size={20} className="fill-[#060911]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                <span className="text-white">Suno AI v5 역설계 프롬프트</span>
                <span className="text-[10px] font-bold bg-[#00f0ff] text-[#060911] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  REVERSE PROMPT
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                업로드 음원을 초정밀 분석하여 Suno AI v5 등 생성 모델에서 동일한 악기·편곡·질감을 재현하는 마스터 프롬프트입니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyPrompt}
            className="px-4 py-2.5 bg-[#00f0ff] hover:bg-[#38bdf8] text-[#060911] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-95 shrink-0"
          >
            {copiedPrompt ? <Check size={14} className="stroke-[3]" /> : <Copy size={14} className="stroke-[2.5]" />}
            <span>{copiedPrompt ? "복사 완료!" : "프롬프트 복사"}</span>
          </button>
        </div>

        <div className="p-4 bg-[#05070d]/90 rounded-2xl border border-[#162035] font-mono text-xs leading-relaxed text-[#00f0ff]/90 whitespace-pre-wrap select-text relative z-10 shadow-inner">
          {data.sunoAiPrompt}
        </div>
      </div>

      {/* 3. 오디오 포렌식 & 품질 분석 카드 */}
      <div className="bg-[#0a0e19]/90 p-5 rounded-2xl border border-[#162035] shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#00f0ff]" />
            <span>음향 포렌식 & 위변조 품질 분석</span>
          </h3>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              data.forensicAnalysis.isUpscaled
                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
            }`}
          >
            {data.forensicAnalysis.isUpscaled ? "⚠️ 가짜 고음질(Upscaled) 의심" : "✅ 순정 마스터 음원 추정"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-[#060911] rounded-xl border border-[#162035]/80">
            <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">추정 소스 품질</span>
            <span className="font-bold text-slate-200">{data.forensicAnalysis.compressionQuality}</span>
          </div>

          <div className="p-3 bg-[#060911] rounded-xl border border-[#162035]/80">
            <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">의심 원본 소스</span>
            <span className="font-bold text-slate-200">{data.forensicAnalysis.suspectedSource}</span>
          </div>

          <div className="p-3 bg-[#060911] rounded-xl border border-[#162035]/80">
            <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">편집 흔적 탐지</span>
            <span className="font-bold text-slate-200">{data.forensicAnalysis.editTraces}</span>
          </div>
        </div>
      </div>

      {/* 4. 4대 스템 청각 묘사 (Stem Separation Insights) */}
      <div className="bg-[#0a0e19]/90 p-5 rounded-2xl border border-[#162035] shadow-lg space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Layers size={16} className="text-[#8b5cf6]" />
          <span>4대 스템(Stem) 음향 분리 묘사</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-[#060911] rounded-xl border border-[#162035] space-y-1.5 hover:border-[#00f0ff]/30 transition-colors">
            <div className="font-bold text-[#00f0ff] flex items-center gap-1.5">
              <span>🎤 Vocals</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {data.stemAnalysis.vocals}
            </p>
          </div>

          <div className="p-3.5 bg-[#060911] rounded-xl border border-[#162035] space-y-1.5 hover:border-[#38bdf8]/30 transition-colors">
            <div className="font-bold text-[#38bdf8] flex items-center gap-1.5">
              <span>🎸 Bass</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {data.stemAnalysis.bass}
            </p>
          </div>

          <div className="p-3.5 bg-[#060911] rounded-xl border border-[#162035] space-y-1.5 hover:border-[#8b5cf6]/30 transition-colors">
            <div className="font-bold text-[#c084fc] flex items-center gap-1.5">
              <span>🥁 Drums</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {data.stemAnalysis.drums}
            </p>
          </div>

          <div className="p-3.5 bg-[#060911] rounded-xl border border-[#162035] space-y-1.5 hover:border-[#10b981]/30 transition-colors">
            <div className="font-bold text-[#34d399] flex items-center gap-1.5">
              <span>🎹 Others (Keys/Synth)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {data.stemAnalysis.others}
            </p>
          </div>
        </div>
      </div>

      {/* 5. 곡 구조 분석 & 채보 데이터 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 곡 구조 타임라인 */}
        <div className="bg-[#0a0e19]/90 p-5 rounded-2xl border border-[#162035] shadow-lg space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Activity size={16} className="text-[#00f0ff]" />
            <span>시각적 곡 구조 분석 (Structure)</span>
          </h3>

          <div className="space-y-2 pt-1 text-xs">
            {data.structuralAnalysis.map((s, idx) => (
              <div key={idx} className="p-3 bg-[#060911] rounded-xl border border-[#162035]/80 flex items-start gap-3">
                <span className="font-bold text-[#00f0ff] font-mono shrink-0 w-24 pt-0.5">
                  {s.section}
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed flex-1">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 작곡 및 채보 데이터 */}
        <div className="bg-[#0a0e19]/90 p-5 rounded-2xl border border-[#162035] shadow-lg space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FileMusic size={16} className="text-[#38bdf8]" />
            <span>작곡 및 채보 데이터 (Notation & Chord Sheet)</span>
          </h3>

          <div className="p-4 bg-[#060911] rounded-xl border border-[#162035]/80 font-mono text-xs text-[#38bdf8] whitespace-pre-wrap leading-relaxed select-text">
            {data.composition.musicalNotation || data.harmonyAndKey.chordProgression}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 bg-[#060911] rounded-lg border border-[#162035]/80">
              <span className="text-[10px] text-slate-500 font-bold block">비트 그리드 느낌</span>
              <span className="font-semibold text-slate-300 text-[11px]">{data.composition.beatGrid}</span>
            </div>
            <div className="p-2.5 bg-[#060911] rounded-lg border border-[#162035]/80">
              <span className="text-[10px] text-slate-500 font-bold block">박자 기호</span>
              <span className="font-semibold text-slate-300 text-[11px]">{data.composition.timeSignature}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. 가사 전사 (Lyric Transcription) */}
      {data.lyricTranscription && (
        <div className="bg-[#0a0e19]/90 p-5 rounded-2xl border border-[#162035] shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-[#8b5cf6]" />
              <span>가사 전사 (Lyric Transcription)</span>
            </h3>

            <button
              type="button"
              onClick={handleCopyLyrics}
              className="px-3 py-1.5 bg-[#0e1526] hover:bg-[#162035] text-slate-200 border border-[#162035] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              {copiedLyrics ? <Check size={13} className="text-[#10b981]" /> : <Copy size={13} />}
              <span>가사 복사</span>
            </button>
          </div>

          <div className="p-4 bg-[#060911] rounded-xl border border-[#162035]/80 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto custom-scrollbar select-text">
            {data.lyricTranscription}
          </div>
        </div>
      )}

      {/* 7. 스타일 및 사운드 심층 분석 */}
      <div className="bg-[#0a0e19]/90 p-5 rounded-2xl border border-[#162035] shadow-lg space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          스타일 및 편곡 사운드 심층 분석
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-[#060911] rounded-xl border border-[#162035]/70 space-y-1">
            <span className="font-bold text-[#00f0ff] text-[11px]">보컬 스타일:</span>
            <p className="text-[11px] text-slate-300 leading-relaxed">{data.stylisticAnalysis.vocalStyle}</p>
          </div>

          <div className="p-3 bg-[#060911] rounded-xl border border-[#162035]/70 space-y-1">
            <span className="font-bold text-[#38bdf8] text-[11px]">악기 연주 기법:</span>
            <p className="text-[11px] text-slate-300 leading-relaxed">{data.stylisticAnalysis.instrumentalTechniques}</p>
          </div>

          <div className="p-3 bg-[#060911] rounded-xl border border-[#162035]/70 space-y-1">
            <span className="font-bold text-[#8b5cf6] text-[11px]">사운드 질감 (Texture):</span>
            <p className="text-[11px] text-slate-300 leading-relaxed">{data.stylisticAnalysis.soundTexture}</p>
          </div>

          <div className="p-3 bg-[#060911] rounded-xl border border-[#162035]/70 space-y-1">
            <span className="font-bold text-[#10b981] text-[11px]">편곡 디테일:</span>
            <p className="text-[11px] text-slate-300 leading-relaxed">{data.stylisticAnalysis.arrangementDetails}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

