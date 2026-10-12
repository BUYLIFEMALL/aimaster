"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Music,
  Image as ImageIcon,
  Film,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Wand2
} from "lucide-react";
import { Track, ExportSettings } from "@/types/playlist";

interface MediaCenterProps {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  bgMedia: { type: 'image' | 'video'; url: string; name?: string } | null;
  setBgMedia: (media: { type: 'image' | 'video'; url: string; name?: string } | null) => void;
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
  gifUrl: string | null;
  setGifUrl: (url: string | null) => void;
  exportSettings: ExportSettings;
  setExportSettings: React.Dispatch<React.SetStateAction<ExportSettings>>;
  onEnterStudio: () => void;
}

export function MediaCenter({
  tracks,
  setTracks,
  bgMedia,
  setBgMedia,
  logoUrl,
  setLogoUrl,
  gifUrl,
  setGifUrl,
  exportSettings,
  setExportSettings,
  onEnterStudio,
}: MediaCenterProps) {
  const [copiedTimeline, setCopiedTimeline] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiMood, setAiMood] = useState("비 오는 날 카페 로파이 감성");
  const [customAiPrompt, setCustomAiPrompt] = useState("");

  const audioInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);

  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      const remMins = mins % 60;
      return `${hrs.toString().padStart(2, '0')}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio files upload handler
  const handleAudioFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newTracks: Track[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.includes('audio') && !file.name.match(/\.(mp3|wav|flac|aac|m4a|ogg)$/i)) continue;

      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      const duration = await new Promise<number>((resolve) => {
        audio.onloadedmetadata = () => resolve(audio.duration || 180);
        audio.onerror = () => resolve(180);
      });

      // Remove extension for clean track title
      const cleanName = file.name.replace(/\.[^/.]+$/, "");

      newTracks.push({
        id: Math.random().toString(36).substring(2, 9),
        name: cleanName,
        duration,
        url,
        file,
        size: file.size,
      });
    }

    setTracks((prev) => [...prev, ...newTracks]);
  };

  // Move track up/down
  const moveTrack = (index: number, direction: 'up' | 'down') => {
    setTracks((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Delete track
  const deleteTrack = (index: number) => {
    setTracks((prev) => prev.filter((_, i) => i !== index));
  };

  // Copy timeline to clipboard for YouTube description
  const handleCopyTimeline = async () => {
    if (tracks.length === 0) return;
    let accumulatedSec = 0;
    const lines = tracks.map((t) => {
      const timeStr = formatTime(accumulatedSec);
      accumulatedSec += t.duration;
      return `${timeStr} ${t.name}`;
    });

    const textToCopy = `[PLAYLIST TRACKLIST]\n${lines.join('\n')}\n\nTotal Duration: ${formatTime(accumulatedSec)}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedTimeline(true);
      setTimeout(() => setCopiedTimeline(false), 2500);
    } catch {
      alert("클립보드 복사에 실패했습니다.");
    }
  };

  // Background media handler
  const handleBgFile = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video');
    setBgMedia({
      type: isVideo ? 'video' : 'image',
      url,
      name: file.name
    });
  };

  // AI Background generator
  const handleGenerateAiBg = async () => {
    setIsAiGenerating(true);
    try {
      const res = await fetch("/api/generate-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moodPrompt: aiMood,
          customPrompt: customAiPrompt
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "AI 배경 생성에 실패했습니다.");
      }

      setBgMedia({
        type: "image",
        url: data.imageUrl,
        name: `AI_Generated_${aiMood}.jpg`
      });
      setShowAiModal(false);
    } catch (e: any) {
      alert(e.message || "오류가 발생했습니다.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const isReady = tracks.length > 0 && bgMedia !== null;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-6 md:p-10 space-y-8">
      {/* 1. 메인 타이틀 헤더 */}
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          미디어 센터
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          영상을 구성할 오디오 파일들과 브랜딩을 위한 로고 이미지를 업로드하세요.
        </p>
      </div>

      {/* 2. 본문 2열 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 좌측: 오디오 트랙 리스트 (7열) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-base">오디오 트랙 리스트</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                WAV / MP3 지원
              </span>
              {tracks.length > 0 && (
                <button
                  onClick={handleCopyTimeline}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-white hover:bg-slate-50 text-indigo-600 border border-slate-200 rounded-lg shadow-2xs transition-colors"
                >
                  {copiedTimeline ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">복사완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>타임라인 복사</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 오디오 파일 드롭존 */}
          <div
            onClick={() => audioInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleAudioFiles(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center group shadow-2xs"
          >
            <input
              ref={audioInputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.flac,.m4a"
              className="hidden"
              onChange={(e) => handleAudioFiles(e.target.files)}
            />
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-105 flex items-center justify-center transition-transform">
              <Upload className="w-7 h-7" />
            </div>
            <h4 className="mt-3 font-bold text-slate-800 text-sm">
              음악 파일을 여기에 드롭하세요
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              또는 클릭하여 파일 탐색기 열기
            </p>
          </div>

          {/* 트랙 목록 리스트 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {tracks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                업로드된 곡이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {tracks.map((track, idx) => (
                  <div
                    key={track.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                      <span className="w-6 text-center text-xs font-bold text-slate-400">
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {track.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          재생 시간: {formatTime(track.duration)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveTrack(idx, 'up')}
                        disabled={idx === 0}
                        title="위로 이동"
                        className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-slate-100"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveTrack(idx, 'down')}
                        disabled={idx === tracks.length - 1}
                        title="아래로 이동"
                        className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-slate-100"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTrack(idx)}
                        title="삭제"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 우측: 배경 미디어 / 로고 / 스티커 / 인코딩 설정 (5열) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. 배경 미디어 업로드 & AI 생성 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                배경 미디어 (이미지/영상)
              </label>
              <button
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>AI 배경 생성</span>
              </button>
            </div>

            <div
              onClick={() => bgInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleBgFile(e.dataTransfer.files[0]);
              }}
              className="border-2 border-dashed border-slate-200 hover:border-slate-300 bg-white rounded-2xl h-60 sm:h-64 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group shadow-2xs transition-all"
            >
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*,video/mp4"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleBgFile(e.target.files[0]);
                }}
              />
              {bgMedia ? (
                <div className="w-full h-full relative">
                  {bgMedia.type === 'image' ? (
                    <img
                      src={bgMedia.url}
                      alt="배경"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={bgMedia.url}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-2">
                    <span>배경 변경하기</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBgMedia(null);
                      }}
                      className="p-1 rounded-md bg-white/20 hover:bg-red-500/80 transition-colors"
                      title="배경 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Film className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">
                    배경 업로드 (JPG, PNG, MP4, GIF)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    16:9 가로 비율 권장
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. 채널 로고 & GIF 스티커 2열 카드 (정사각형 박스) */}
          <div className="grid grid-cols-2 gap-4">
            {/* 채널 로고 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">채널 로고</label>
              <div
                onClick={() => logoInputRef.current?.click()}
                className="border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70 rounded-2xl aspect-square w-full flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group shadow-2xs transition-all"
              >
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setLogoUrl(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                />
                {logoUrl ? (
                  <div className="w-full h-full relative p-3 flex items-center justify-center">
                    <img src={logoUrl} alt="로고" className="max-h-full max-w-full object-contain" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-2">
                      <span>변경</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLogoUrl(null);
                        }}
                        className="p-1 rounded bg-white/20 hover:bg-red-500/80 transition-colors"
                        title="로고 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
                      로고 추가
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* GIF 스티커 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">GIF 스티커</label>
              <div
                onClick={() => gifInputRef.current?.click()}
                className="border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70 rounded-2xl aspect-square w-full flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group shadow-2xs transition-all"
              >
                <input
                  ref={gifInputRef}
                  type="file"
                  accept="image/gif"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setGifUrl(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                />
                {gifUrl ? (
                  <div className="w-full h-full relative p-3 flex items-center justify-center">
                    <img src={gifUrl} alt="GIF" className="max-h-full max-w-full object-contain" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-2">
                      <span>변경</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGifUrl(null);
                        }}
                        className="p-1 rounded bg-white/20 hover:bg-red-500/80 transition-colors"
                        title="GIF 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <span className="text-[10px] font-black text-slate-500">GIF</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
                      GIF 추가
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. 인코딩 설정 카드 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              인코딩 설정
            </h4>

            {/* 재생 횟수 (REPEAT) */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>재생 횟수 (REPEAT)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setExportSettings((prev) => ({ ...prev, repeatCount: cnt }))}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      exportSettings.repeatCount === cnt
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {cnt}회
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                전체 플레이리스트를 {exportSettings.repeatCount}번 반복하여 렌더링합니다.
              </p>
            </div>

            {/* 오디오 품질 (VBR) */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>오디오 품질 (VBR)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "96kbps", val: 96000 },
                  { label: "128kbps", val: 128000 },
                  { label: "192kbps", val: 192000 },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setExportSettings((prev) => ({ ...prev, audioBitrate: item.val }))}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      exportSettings.audioBitrate === item.val
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                고품질 사운드 (최대 지원)
              </p>
            </div>
          </div>

          {/* 4. 스튜디오 입장하기 버튼 */}
          <button
            onClick={onEnterStudio}
            disabled={!isReady}
            className={`w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
              isReady
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <span>스튜디오 입장하기</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          {!isReady && (
            <p className="text-center text-[11px] text-slate-400">
              * 최소 1개 이상의 음악 파일과 배경 미디어를 등록해주세요.
            </p>
          )}
        </div>
      </div>

      {/* AI 배경 생성 모달 */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <Wand2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Gemini AI 배경 생성기</h3>
                <p className="text-xs text-slate-500">16:9 유튜브 플레이리스트 맞춤 초고화질 감성 아트 생성</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700">분위기 프리셋 선택</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "비 오는 날 카페 로파이 감성",
                  "화려한 시티팝 네온 밤거리",
                  "차분한 가을 숲속 햇살 힐링",
                  "빈티지 아날로그 레코드 룸",
                  "몽환적인 우주 밤하늘 은하수",
                  "포근한 침실 새벽 감성 스탠드"
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAiMood(preset)}
                    className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition-all ${
                      aiMood === preset
                        ? "bg-purple-50 text-purple-700 border-purple-300"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">상세 프롬프트 직접 입력 (선택)</label>
              <input
                type="text"
                placeholder="예: Cozy studio apartment with city view at sunset"
                value={customAiPrompt}
                onChange={(e) => setCustomAiPrompt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleGenerateAiBg}
                disabled={isAiGenerating}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI 생성 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>배경 생성 및 적용</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
