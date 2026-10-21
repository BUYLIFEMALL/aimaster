"use client";

import { ReferenceNotePanel } from "./ReferenceNotePanel";
import { SunoImportPanel } from "./SunoImportPanel";
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
  Wand2,
  GripVertical
} from "lucide-react";
import { Track, ExportSettings } from "@/types/playlist";
import { isSynced, parseLyrics, type LyricLine } from "@/lib/lyrics";

// v1.17 곡별 가사 파일 읽기 — UTF-8로 깨지면 메모장 옛 저장(EUC-KR)으로 다시 읽는다
async function readLyrics(file: File): Promise<LyricLine[]> {
  const buf = await file.arrayBuffer();
  let raw = new TextDecoder("utf-8").decode(buf);
  if (raw.includes("\uFFFD")) { try { raw = new TextDecoder("euc-kr").decode(buf); } catch { /* 그대로 */ } }
  return parseLyrics(raw, file.name).lines.filter(isSynced);
}
const LYRIC_EXT = /\.(srt|lrc|txt)$/i;
const baseName = (n: string) => n.replace(/\.[^/.]+$/, "").toLowerCase();

interface MediaCenterProps {
  userId?: string | null;
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
  userId,
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
  const lyricInputRef = useRef<HTMLInputElement>(null);
  const [lyricTarget, setLyricTarget] = useState<number | null>(null);
  const [lyricMsg, setLyricMsg] = useState("");
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
    // 같은 이름의 .srt/.lrc를 함께 고르면 그 곡의 가사로 자동 짝(예: 봄날.mp3 + 봄날.srt)
    const lyricFiles = new Map<string, File>();
    for (let i = 0; i < files.length; i++) if (LYRIC_EXT.test(files[i].name)) lyricFiles.set(baseName(files[i].name), files[i]);

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
        ...(lyricFiles.has(baseName(file.name)) ? await readLyrics(lyricFiles.get(baseName(file.name))!).then((lyrics) => (lyrics.length ? { lyrics, lyricsName: lyricFiles.get(baseName(file.name))!.name } : {})).catch(() => ({})) : {}),
      });
    }

    setTracks((prev) => [...prev, ...newTracks]);
  };

  // v1.24 끌어서 순서 바꾸기(같은 목록 안의 줄만 — 파일 끌어다 놓기와 섞이지 않게 drag 중인 줄 번호가 있을 때만 처리)
  const [dragIdx, setDragIdx] = useState<number | null>(null), [overIdx, setOverIdx] = useState<number | null>(null);
  const dropTrack = (to: number) => {
    if (dragIdx === null || dragIdx === to) return;
    setTracks((prev) => { const copy = [...prev]; const [moved] = copy.splice(dragIdx, 1); copy.splice(to, 0, moved); return copy; });
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

  // v1.17 곡마다 가사 넣기·빼기
  const attachLyrics = async (index: number, file: File) => {
    setLyricMsg("");
    try {
      const lyrics = await readLyrics(file);
      if (!lyrics.length) { setLyricMsg(`「${file.name}」에서 시간이 있는 가사를 찾지 못했습니다. .srt나 .lrc처럼 시간이 붙은 파일을 넣어 주세요(시간 맞추기는 AI 가사영상 자동화에서 할 수 있습니다).`); return; }
      setTracks((prev) => prev.map((t, i) => (i === index ? { ...t, lyrics, lyricsName: file.name } : t)));
    } catch { setLyricMsg("가사 파일을 읽지 못했습니다."); }
  };
  const removeLyrics = (index: number) => setTracks((prev) => prev.map((t, i) => (i === index ? { ...t, lyrics: undefined, lyricsName: undefined } : t)));

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
    <div className="flex-1 overflow-y-auto bg-[#0f0f0f] text-[#f1f1f1] p-6 md:p-10 space-y-8 custom-scrollbar">
      <ReferenceNotePanel userId={userId} />
      {/* 1. 메인 타이틀 헤더 */}
      <div className="border-b border-[#272727] pb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-9 items-center justify-center rounded-lg bg-[#ff0000] text-white shadow-md shadow-red-950">
              <Film className="w-4 h-4 fill-current" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              미디어 센터
            </h2>
          </div>
          <p className="text-sm text-[#aaaaaa] mt-1.5">
            영상을 구성할 음원 파일들과 브랜딩을 위한 로고·배경 아트를 등록하세요.
          </p>
        </div>
      </div>

      {/* 2. 본문 2열 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 좌측: 오디오 트랙 리스트 (7열) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-[#ff0000]" />
              <h3 className="font-bold text-white text-base">오디오 트랙 리스트</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-red-950/50 text-[#ff4e45] border border-red-900/40">
                WAV / MP3 지원
              </span>
              {tracks.length > 0 && (
                <button
                  onClick={handleCopyTimeline}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-[#181818] hover:bg-[#272727] text-white border border-[#272727] rounded-lg transition-colors"
                >
                  {copiedTimeline ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">복사완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#aaaaaa]" />
                      <span>타임라인 복사</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* v1.19 음악(SUNO) 자동화 곡 여러 개 + 시간 가사 가져오기 */}
          <SunoImportPanel setTracks={setTracks} hasBg={!!bgMedia} setBgMedia={setBgMedia} />

          {/* 오디오 파일 드롭존 */}
          <div
            onClick={() => audioInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleAudioFiles(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-[#272727] hover:border-[#ff0000] bg-[#181818] hover:bg-[#212121] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center group"
          >
            <input
              ref={audioInputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.flac,.m4a,.srt,.lrc"
              className="hidden"
              onChange={(e) => handleAudioFiles(e.target.files)}
            />
            <input
              ref={lyricInputRef}
              type="file"
              accept=".srt,.lrc,.txt,text/plain"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f && lyricTarget !== null) void attachLyrics(lyricTarget, f); e.target.value = ""; }}
            />
            <div className="w-14 h-14 rounded-2xl bg-[#272727] text-[#ff0000] group-hover:bg-[#ff0000] group-hover:text-white group-hover:scale-105 flex items-center justify-center transition-all">
              <Upload className="w-7 h-7" />
            </div>
            <h4 className="mt-3 font-bold text-white text-sm">
              음악 파일을 여기에 드롭하세요
            </h4>
            <p className="text-xs text-[#aaaaaa] mt-0.5">
              또는 클릭하여 파일 탐색기 열기 (다중 선택 가능)
            </p>
          </div>

          {/* 트랙 목록 리스트 */}
          <div className="bg-[#181818] rounded-2xl border border-[#272727] overflow-hidden">
            {lyricMsg && <p className="px-4 py-2 text-[11px] text-amber-300 border-b border-[#272727]">{lyricMsg}</p>}
            {tracks.length === 0 ? (
              <div className="py-12 text-center text-[#777777] text-xs">
                업로드된 음원이 없습니다. 음악 파일을 드롭해 시작하세요.
              </div>
            ) : (
              <div className="divide-y divide-[#272727] max-h-[380px] overflow-y-auto custom-scrollbar">
                {tracks.map((track, idx) => (
                  <div
                    key={track.id}
                    draggable
                    onDragStart={(e) => { setDragIdx(idx); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", track.id); }}
                    onDragOver={(e) => { if (dragIdx === null) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOverIdx(idx); }}
                    onDrop={(e) => { if (dragIdx === null) return; e.preventDefault(); e.stopPropagation(); dropTrack(idx); setDragIdx(null); setOverIdx(null); }}
                    onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                    className={`p-3.5 flex items-center justify-between hover:bg-[#212121] transition-colors ${dragIdx === idx ? "opacity-40" : ""} ${overIdx === idx && dragIdx !== null && dragIdx !== idx ? "bg-[#2a1515] outline outline-1 outline-[#ff0000]/60" : ""}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                      <GripVertical className="w-4 h-4 shrink-0 text-[#555] cursor-grab active:cursor-grabbing" aria-label="끌어서 순서 바꾸기" />
                      <span className="w-6 text-center text-xs font-mono font-bold text-[#777777]">
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">
                          {track.name}
                        </p>
                        <p className="text-[10px] text-[#aaaaaa] mt-0.5 font-mono">
                          재생 시간: {formatTime(track.duration)}
                          {track.lyrics?.length ? <span className="ml-2 text-cyan-300">· 가사 {track.lyrics.length}줄</span> : null}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {track.lyrics?.length ? (
                        <button onClick={() => removeLyrics(idx)} title={`가사 빼기 (${track.lyricsName ?? ""})`} className="px-2 py-1 text-[10px] font-bold text-cyan-300 rounded hover:bg-[#272727]">가사 ✕</button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setLyricTarget(idx); lyricInputRef.current?.click(); }} title="이 곡의 가사(.srt/.lrc) 넣기" className="px-2 py-1 text-[10px] font-bold text-[#aaaaaa] hover:text-white rounded hover:bg-[#272727]">＋ 가사</button>
                      )}
                      <button
                        onClick={() => moveTrack(idx, 'up')}
                        disabled={idx === 0}
                        title="위로 이동"
                        className="p-1.5 text-[#aaaaaa] hover:text-white disabled:opacity-20 disabled:pointer-events-none rounded hover:bg-[#272727] transition-colors"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveTrack(idx, 'down')}
                        disabled={idx === tracks.length - 1}
                        title="아래로 이동"
                        className="p-1.5 text-[#aaaaaa] hover:text-white disabled:opacity-20 disabled:pointer-events-none rounded hover:bg-[#272727] transition-colors"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTrack(idx)}
                        title="삭제"
                        className="p-1.5 text-[#aaaaaa] hover:text-rose-400 rounded hover:bg-rose-950/40 transition-colors"
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
              <label className="text-xs font-bold text-[#aaaaaa] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#ff0000]" />
                배경 미디어 (이미지/영상)
              </label>
              <button
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#ff4e45] bg-red-950/40 hover:bg-red-900/60 border border-red-900/40 rounded-lg transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#ff0000]" />
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
              className="border-2 border-dashed border-[#272727] hover:border-[#ff0000] bg-[#181818] hover:bg-[#212121] rounded-2xl h-60 sm:h-64 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group transition-all"
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
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-2">
                    <span>배경 변경하기</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBgMedia(null);
                      }}
                      className="p-1 rounded-md bg-white/20 hover:bg-red-600 transition-colors"
                      title="배경 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#272727] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-[#ff0000]">
                    <Film className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-white">
                    배경 업로드 (JPG, PNG, MP4, GIF)
                  </p>
                  <p className="text-[11px] text-[#aaaaaa] mt-1">
                    16:9 가로 비율 권장 (1920×1080)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. 채널 로고 & GIF 스티커 2열 카드 (정사각형 박스) */}
          <div className="grid grid-cols-2 gap-4">
            {/* 채널 로고 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#aaaaaa]">채널 로고</label>
              <div
                onClick={() => logoInputRef.current?.click()}
                className="border border-[#272727] hover:border-[#ff0000] bg-[#181818] hover:bg-[#212121] rounded-2xl aspect-square w-full flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group transition-all"
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
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-2">
                      <span>변경</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLogoUrl(null);
                        }}
                        className="p-1 rounded bg-white/20 hover:bg-red-600 transition-colors"
                        title="로고 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-3">
                    <div className="w-9 h-9 rounded-xl bg-[#272727] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform text-[#aaaaaa]">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#aaaaaa] group-hover:text-white transition-colors">
                      로고 추가
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* GIF 스티커 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#aaaaaa]">GIF 스티커</label>
              <div
                onClick={() => gifInputRef.current?.click()}
                className="border border-[#272727] hover:border-[#ff0000] bg-[#181818] hover:bg-[#212121] rounded-2xl aspect-square w-full flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group transition-all"
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
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-2">
                      <span>변경</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGifUrl(null);
                        }}
                        className="p-1 rounded bg-white/20 hover:bg-red-600 transition-colors"
                        title="GIF 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-3">
                    <div className="w-9 h-9 rounded-xl bg-[#272727] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform text-[#aaaaaa]">
                      <span className="text-[10px] font-black">GIF</span>
                    </div>
                    <span className="text-xs font-bold text-[#aaaaaa] group-hover:text-white transition-colors">
                      GIF 추가
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. 인코딩 설정 카드 */}
          <div className="bg-[#181818] rounded-2xl border border-[#272727] p-5 space-y-4">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-[#ff0000] rounded-full inline-block" />
              인코딩 기본 프리셋
            </h4>

            {/* 재생 횟수 (REPEAT) */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#aaaaaa]">
                <span>반복 횟수 (REPEAT)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setExportSettings((prev) => ({ ...prev, repeatCount: cnt }))}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      exportSettings.repeatCount === cnt
                        ? "bg-[#ff0000] text-white border-[#ff0000] shadow-md shadow-red-950"
                        : "bg-[#212121] text-[#aaaaaa] border-[#272727] hover:bg-[#272727] hover:text-white"
                    }`}
                  >
                    {cnt}회 반복
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#777777]">
                전체 플레이리스트를 {exportSettings.repeatCount}번 루프하여 렌더링합니다.
              </p>
            </div>

            {/* 오디오 품질 (VBR) */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#aaaaaa]">
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
                        ? "bg-[#ff0000] text-white border-[#ff0000] shadow-md shadow-red-950"
                        : "bg-[#212121] text-[#aaaaaa] border-[#272727] hover:bg-[#272727] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#777777]">
                YouTube 권장 고품질 오디오 비트레이트
              </p>
            </div>
          </div>

          {/* 4. 스튜디오 입장하기 버튼 */}
          <button
            onClick={onEnterStudio}
            disabled={!isReady}
            className={`w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${
              isReady
                ? "bg-[#ff0000] hover:bg-[#cc0000] text-white shadow-lg shadow-red-950 cursor-pointer"
                : "bg-[#212121] text-[#555555] border border-[#272727] cursor-not-allowed"
            }`}
          >
            <span>편집 스튜디오 입장하기</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          {!isReady && (
            <p className="text-center text-[11px] text-[#777777]">
              * 최소 1개 이상의 음악 파일과 배경 미디어를 등록해주세요.
            </p>
          )}
        </div>
      </div>

      {/* AI 배경 생성 모달 */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#181818] rounded-2xl border border-[#272727] w-full max-w-lg p-6 shadow-2xl space-y-5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-900/40 text-[#ff0000] flex items-center justify-center">
                <Wand2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Gemini AI 배경 생성기</h3>
                <p className="text-xs text-[#aaaaaa]">16:9 유튜브 플레이리스트 맞춤 초고화질 감성 아트 생성</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#aaaaaa]">분위기 프리셋 선택</label>
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
                        ? "bg-red-950/60 text-[#ff4e45] border-red-900/60"
                        : "bg-[#212121] text-[#aaaaaa] border-[#272727] hover:bg-[#272727] hover:text-white"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#aaaaaa]">상세 프롬프트 직접 입력 (선택)</label>
              <input
                type="text"
                placeholder="예: Cozy studio apartment with city view at sunset, lofi vibe"
                value={customAiPrompt}
                onChange={(e) => setCustomAiPrompt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#272727] bg-[#121212] text-white placeholder-[#666666] text-xs focus:outline-hidden focus:border-[#ff0000]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#aaaaaa] hover:bg-[#272727] hover:text-white rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleGenerateAiBg}
                disabled={isAiGenerating}
                className="px-5 py-2.5 bg-[#ff0000] hover:bg-[#cc0000] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-red-950 transition-colors"
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
