"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Video,
  ChevronDown,
  Palette,
  Check,
  Disc3,
  BarChart3,
  Waves,
  Activity,
  Sparkles,
  Zap,
  Flame,
  Droplets,
  Tv,
  Layers,
  HeartPulse,
  Vibrate,
  Sliders,
  Settings2,
  Maximize2
} from "lucide-react";
import { Track, StudioSettings, VisualizerType, FilterType, ColorPreset } from "@/types/playlist";
import {
  VISUALIZER_OPTIONS,
  FILTER_OPTIONS,
  OVERLAY_OPTIONS,
  PARTY_OPTIONS,
  PARTICLE_OPTIONS,
  PALETTE_PRESETS,
  EFFECT_COLOR_PRESETS
} from "@/data/presets";
import {
  drawSpectrumVisualizer,
  drawVignette,
  drawFilmGrain,
  drawLightLeaks,
  getFilterString
} from "@/lib/render/canvas-visualizer";
import { ParticleSystem } from "@/lib/render/particle-system";
import { drawCover, drawLyricsLayer } from "@/lib/render/lyrics-layer";
import { timeline, type LyricLine } from "@/lib/lyrics";

interface EditorStudioProps {
  tracks: Track[];
  bgMedia: { type: 'image' | 'video'; url: string } | null;
  logoUrl: string | null;
  gifUrl: string | null;
  settings: StudioSettings;
  setSettings: React.Dispatch<React.SetStateAction<StudioSettings>>;
  onExportClick: () => void;
  isExporting: boolean;
  exportProgress: number;
  /** v1.17 화면 모양(내보내기 설정과 같은 값) */
  aspect: '16:9' | '9:16';
  setAspect: (a: '16:9' | '9:16') => void;
}

export function EditorStudio({
  tracks,
  bgMedia,
  logoUrl,
  gifUrl,
  settings,
  setSettings,
  onExportClick,
  isExporting,
  exportProgress,
  aspect,
  setAspect,
}: EditorStudioProps) {
  const portrait = aspect === '9:16';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentTrack = tracks[currentTrackIndex] || null;
  // v1.17 지금 곡의 가사 시간표(그리기 반복문이 매 장면 읽는다)
  const lyricsRef = useRef<LyricLine[]>([]);
  lyricsRef.current = currentTrack?.lyrics?.length ? timeline(currentTrack.lyrics, currentTrack.duration || Infinity) : [];

  // Background and logo images cache
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const gifImgRef = useRef<HTMLImageElement | null>(null);
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem());

  // Load Background Image
  useEffect(() => {
    if (bgMedia && bgMedia.type === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = bgMedia.url;
      img.onload = () => { bgImgRef.current = img; };
    } else {
      bgImgRef.current = null;
    }
  }, [bgMedia]);

  // Load Logo Image
  useEffect(() => {
    if (logoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = logoUrl;
      img.onload = () => { logoImgRef.current = img; };
    } else {
      logoImgRef.current = null;
    }
  }, [logoUrl]);

  // Load GIF Image
  useEffect(() => {
    if (gifUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = gifUrl;
      img.onload = () => { gifImgRef.current = img; };
    } else {
      gifImgRef.current = null;
    }
  }, [gifUrl]);

  // Setup Audio Context & Analyser
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    if (currentTrack) {
      audio.src = currentTrack.url;
      audio.load();
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };
    const handleEnded = () => {
      if (currentTrackIndex < tracks.length - 1) {
        setCurrentTrackIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack, currentTrackIndex, tracks.length]);

  // Handle Play/Pause
  const togglePlay = async () => {
    if (!audioRef.current || !currentTrack) return;

    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    }

    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      await audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();

    const render = () => {
      const now = performance.now();
      const timeMs = now - startTime;
      const width = canvas.width;
      const height = canvas.height;

      // Frequency data
      const freqData = new Uint8Array(128);
      let bassLevel = 0;
      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(freqData);
        // Bass average (first 10 bins)
        let bassSum = 0;
        for (let b = 0; b < 10; b++) bassSum += freqData[b];
        bassLevel = bassSum / 10;
      } else {
        // Subtle ambient idle motion if paused
        for (let f = 0; f < freqData.length; f++) {
          freqData[f] = Math.round(
            Math.abs(Math.sin(timeMs * 0.002 + f * 0.1)) * 30 +
            Math.abs(Math.cos(timeMs * 0.0015 + f * 0.05)) * 15
          );
        }
      }

      ctx.save();

      // 1. Zoom pulse / shake FX
      let scale = 1;
      if (settings.zoomPulse && bassLevel > 80) {
        scale = 1 + (bassLevel / 255) * 0.04;
      }
      let shakeX = 0;
      let shakeY = 0;
      if (settings.shakeEnabled && bassLevel > 70) {
        const p = (settings.shakeIntensity / 100) * 12;
        shakeX = (Math.random() - 0.5) * p;
        shakeY = (Math.random() - 0.5) * p;
      }

      ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);

      // 2. Clear canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // 3. Draw Background with Filters & Brightness
      if (bgImgRef.current) {
        ctx.save();
        const filterStr = getFilterString(settings.filterType, settings.filterIntensity, bassLevel);
        const brightStr = `brightness(${settings.brightness}%)`;
        ctx.filter = `${brightStr} ${filterStr}`.trim();
        if (portrait) drawCover(ctx, bgImgRef.current, width, height); else ctx.drawImage(bgImgRef.current, 0, 0, width, height);
        ctx.restore();
      }

      // 4. Strobe / Club Lighting FX
      if (settings.strobeFlash && bassLevel > 160) {
        const strobeA = ((bassLevel - 160) / 95) * (settings.strobeIntensity / 100) * 0.8;
        ctx.fillStyle = `rgba(255, 255, 255, ${strobeA})`;
        ctx.fillRect(0, 0, width, height);
      }

      // 5. Light Leaks & Vignette
      if (settings.vignette) {
        drawVignette(ctx, width, height, settings.vignetteIntensity);
      }
      if (settings.lightLeaks) {
        drawLightLeaks(ctx, width, height, settings.lightLeaksIntensity, timeMs);
      }
      if (settings.filmGrain) {
        drawFilmGrain(ctx, width, height, settings.filmGrainIntensity);
      }

      // 6. Audio Spectrum Visualizer
      drawSpectrumVisualizer(ctx, width, height, freqData, settings, timeMs);

      // 7. Particles
      particleSystemRef.current.updateAndDraw(ctx, width, height, settings, timeMs);

      // 7-1. v1.17 가사(지금 곡, 재생 위치 기준 — 내보내기와 같은 함수)
      drawLyricsLayer(ctx, width, height, lyricsRef.current, audioRef.current?.currentTime ?? 0, settings);

      // 8. Channel Logo
      if (logoImgRef.current) {
        ctx.save();
        ctx.globalAlpha = settings.logoOpacity / 100;
        const lSize = (settings.logoSize / 100) * 100;
        const lX = (settings.logoX / 100) * width;
        const lY = (settings.logoY / 100) * height;
        if (settings.logoShadowEnabled) {
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = settings.logoShadowSize;
        }
        ctx.drawImage(logoImgRef.current, lX, lY, lSize, lSize);
        ctx.restore();
      }

      // 9. GIF Sticker
      if (gifImgRef.current) {
        ctx.save();
        ctx.globalAlpha = settings.gifOpacity / 100;
        const gSize = (settings.gifSize / 100) * 150;
        const gX = settings.gifCentered ? (width - gSize) / 2 : (settings.gifX / 100) * width;
        const gY = settings.gifCentered ? (height - gSize) / 2 : (settings.gifY / 100) * height;
        if (settings.gifShadowEnabled) {
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = settings.gifShadowSize;
        }
        ctx.drawImage(gifImgRef.current, gX, gY, gSize, gSize);
        ctx.restore();
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [settings, isPlaying, portrait]);

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0f0f0f] text-[#f1f1f1]">
      {/* 1. 상단 액션 바 */}
      <header className="h-16 bg-[#181818] border-b border-[#272727] px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-900/40 text-[#ff0000] flex items-center justify-center font-black">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-white text-sm md:text-base">편집 스튜디오</h2>
            <p className="text-[10px] text-[#ff0000] font-bold uppercase tracking-wider font-mono">
              YOUTUBE STUDIO ENGINE ACTIVE
            </p>
          </div>
        </div>

        <button
          onClick={onExportClick}
          disabled={isExporting || tracks.length === 0}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            isExporting
              ? "bg-[#272727] text-[#777777] cursor-wait"
              : "bg-[#ff0000] hover:bg-[#cc0000] text-white cursor-pointer shadow-md shadow-red-950"
          }`}
        >
          <Video className="w-4 h-4" />
          {isExporting ? (
            <span>비디오 렌더링 {exportProgress}%</span>
          ) : (
            <span>비디오 내보내기</span>
          )}
        </button>
      </header>

      {/* 2. 3단 메인 작업 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 패널: 스펙트럼, 필터, 오버레이, 파티클 */}
        <aside className="w-80 bg-[#181818] border-r border-[#272727] overflow-y-auto p-5 space-y-6 shrink-0 custom-scrollbar">
          {/* 오디오 스펙트럼 10종 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#ff0000]" />
                오디오 스펙트럼
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {VISUALIZER_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setSettings((prev) => ({ ...prev, visualizerType: opt.type }))}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition-all text-left ${
                    settings.visualizerType === opt.type
                      ? "bg-red-950/60 border-red-800 text-[#ff4e45]"
                      : "bg-[#212121] border-[#272727] text-[#aaaaaa] hover:bg-[#272727] hover:text-white"
                  }`}
                >
                  <Disc3 className={`w-3.5 h-3.5 shrink-0 ${settings.visualizerType === opt.type ? 'text-[#ff0000]' : 'text-[#777777]'}`} />
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 배경 필터 & 비네팅 */}
          <div className="space-y-3 pt-3 border-t border-[#272727]">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              배경 필터 & 비네팅
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {FILTER_OPTIONS.map((f) => (
                <button
                  key={f.type}
                  onClick={() => setSettings((prev) => ({ ...prev, filterType: f.type }))}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                    settings.filterType === f.type
                      ? "bg-red-950/60 border-red-800 text-[#ff4e45]"
                      : "bg-[#212121] border-[#272727] text-[#aaaaaa] hover:bg-[#272727] hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* 필터 슬라이더 3종 */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-[#aaaaaa]">
                  <span>필터 강도</span>
                  <span className="font-mono text-white">{settings.filterIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.filterIntensity}
                  onChange={(e) => setSettings((prev) => ({ ...prev, filterIntensity: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-[#272727] rounded-lg appearance-none cursor-pointer accent-[#ff0000]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-[#aaaaaa]">
                  <span>배경 밝기</span>
                  <span className="font-mono text-white">{settings.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="180"
                  value={settings.brightness}
                  onChange={(e) => setSettings((prev) => ({ ...prev, brightness: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-[#272727] rounded-lg appearance-none cursor-pointer accent-[#ff0000]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-[#aaaaaa]">
                  <span>비네팅 세기</span>
                  <span className="font-mono text-white">{settings.vignetteIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.vignetteIntensity}
                  onChange={(e) => setSettings((prev) => ({ ...prev, vignetteIntensity: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-[#272727] rounded-lg appearance-none cursor-pointer accent-[#ff0000]"
                />
              </div>
            </div>
          </div>

          {/* 트렌디 오버레이 10종 */}
          <div className="space-y-3 pt-3 border-t border-[#272727]">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              트렌디 오버레이
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {OVERLAY_OPTIONS.map((ov) => {
                const isActive = (settings as any)[ov.id];
                return (
                  <button
                    key={ov.id}
                    onClick={() => setSettings((prev) => ({ ...prev, [ov.id]: !isActive }))}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      isActive
                        ? "bg-red-950/60 border-red-800 text-[#ff4e45]"
                        : "bg-[#212121] border-[#272727] text-[#aaaaaa] hover:bg-[#272727] hover:text-white"
                    }`}
                  >
                    <span>{ov.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 파티 모드 (EDM 전용) */}
          <div className="space-y-3 pt-3 border-t border-[#272727]">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              파티 모드 (EDM 전용)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {PARTY_OPTIONS.map((pt) => {
                const isActive = (settings as any)[pt.id];
                return (
                  <button
                    key={pt.id}
                    onClick={() => setSettings((prev) => ({ ...prev, [pt.id]: !isActive }))}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      isActive
                        ? "bg-red-950/60 border-red-800 text-[#ff4e45]"
                        : "bg-[#212121] border-[#272727] text-[#aaaaaa] hover:bg-[#272727] hover:text-white"
                    }`}
                  >
                    <span>{pt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 스타일 파티클 14종 */}
          <div className="space-y-3 pt-3 border-t border-[#272727]">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              스타일 파티클
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {PARTICLE_OPTIONS.map((po) => {
                const isActive = (settings as any)[po.id];
                return (
                  <button
                    key={po.id}
                    onClick={() => setSettings((prev) => ({ ...prev, [po.id]: !isActive }))}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      isActive
                        ? "bg-red-950/60 border-red-800 text-[#ff4e45]"
                        : "bg-[#212121] border-[#272727] text-[#aaaaaa] hover:bg-[#272727] hover:text-white"
                    }`}
                  >
                    <span>{po.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 효과 컬러 (공통) */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-[#aaaaaa]">효과 컬러 (공통)</span>
              <div className="flex items-center gap-2">
                {EFFECT_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSettings((prev) => ({ ...prev, overlayColor: color }))}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-full border border-[#272727] transition-transform ${
                      settings.overlayColor === color ? "scale-125 ring-2 ring-[#ff0000] ring-offset-1 ring-offset-[#181818]" : "hover:scale-110"
                    }`}
                  />
                ))}
                <input
                  type="text"
                  value={settings.overlayColor}
                  onChange={(e) => setSettings((prev) => ({ ...prev, overlayColor: e.target.value }))}
                  className="w-20 px-2 py-1 text-[11px] font-mono font-bold border border-[#272727] rounded-lg bg-[#121212] text-white"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* 중앙: 16:9 캔버스 및 오디오 플레이어 바 */}
        <main className="flex-1 flex flex-col items-center justify-between p-6 overflow-hidden bg-[#0f0f0f]">
          {/* 상단 16:9 대형 캔버스 */}
          <div className="w-full flex-1 flex items-center justify-center min-h-0">
            <div className={`relative ${portrait ? "h-full max-h-[70vh] aspect-[9/16]" : "w-full max-w-4xl aspect-video"} bg-black rounded-2xl overflow-hidden shadow-2xl border border-[#272727] flex items-center justify-center group`}>
              <canvas
                ref={canvasRef}
                width={portrait ? 1080 : 1920}
                height={portrait ? 1920 : 1080}
                className="w-full h-full object-contain"
              />

              {/* 재생/일시정지 큰 오버레이 버튼 */}
              <button
                onClick={togglePlay}
                className="absolute w-16 h-16 rounded-full bg-black/70 hover:bg-[#ff0000] text-white flex items-center justify-center backdrop-blur-xs transition-all hover:scale-110 shadow-xl cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7" />
                ) : (
                  <Play className="w-7 h-7 ml-1 fill-current" />
                )}
              </button>
            </div>
          </div>

          {/* 캔버스 하단 트랙 셀렉터 & 하단 플레이어 바 */}
          <div className="w-full max-w-4xl mt-4 space-y-3">
            {/* 트랙 선택 드롭다운 */}
            <div className="flex items-center justify-between bg-[#181818] px-4 py-2.5 rounded-xl border border-[#272727]">
              <span className="text-xs font-bold text-[#aaaaaa]">재생 트랙 선택</span>
              <select
                value={currentTrackIndex}
                onChange={(e) => {
                  setCurrentTrackIndex(Number(e.target.value));
                  setIsPlaying(false);
                }}
                className="text-xs font-bold text-white bg-[#181818] border-none focus:outline-hidden cursor-pointer"
              >
                {tracks.map((t, idx) => (
                  <option key={t.id} value={idx} className="bg-[#181818] text-white">
                    {idx + 1}. {t.name} ({formatSec(t.duration)})
                  </option>
                ))}
              </select>
            </div>

            {/* 하단 오디오 플레이어 바 */}
            <div className="bg-[#181818] p-4 rounded-2xl border border-[#272727] flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-xl bg-[#ff0000] hover:bg-[#cc0000] text-white flex items-center justify-center shadow-md shadow-red-950 shrink-0 transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs font-bold text-white mb-1">
                  <span className="truncate">{currentTrack?.name || "선택된 음원 없음"}</span>
                  <span className="text-[#aaaaaa] font-mono text-[11px]">
                    {formatSec(currentTime)} / {formatSec(duration)}
                  </span>
                </div>
                {/* 시크바 */}
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = Number(e.target.value);
                      setCurrentTime(Number(e.target.value));
                    }
                  }}
                  className="w-full h-1.5 bg-[#272727] rounded-lg appearance-none cursor-pointer accent-[#ff0000]"
                />
              </div>
            </div>
          </div>
        </main>

        {/* 우측 패널: 레이아웃 조정, 채널 로고, GIF 스티커, 메인 컬러, 스펙트럼 세부배치 */}
        <aside className="w-80 bg-[#181818] border-l border-[#272727] overflow-y-auto p-5 space-y-6 shrink-0 custom-scrollbar">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-[#ff0000]" />
            레이아웃 조정
          </h3>

          {/* v1.17 화면 모양 · 가사 표시 */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#aaaaaa]">화면 모양</h4>
            <div className="grid grid-cols-2 gap-2">
              {([["16:9", "가로 16:9"], ["9:16", "세로 9:16"]] as const).map(([a, label]) => (
                <button key={a} onClick={() => setAspect(a)} className={`py-1.5 text-[11px] font-bold rounded-lg border ${aspect === a ? "bg-[#ff0000] text-white border-[#ff0000]" : "bg-[#212121] text-[#aaaaaa] border-[#272727] hover:text-white"}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#aaaaaa]">가사 표시</h4>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#aaaaaa]"><input type="checkbox" checked={settings.lyricsEnabled} onChange={(e) => setSettings((p) => ({ ...p, lyricsEnabled: e.target.checked }))} />켜기</label>
            </div>
            <p className="text-[10px] text-[#777777] leading-relaxed">{currentTrack?.lyrics?.length ? `이 곡 가사 ${currentTrack.lyrics.length}줄 · 「① 음악·배경 넣기」에서 곡마다 .srt/.lrc를 넣습니다.` : "이 곡에는 가사가 없습니다. 「① 음악·배경 넣기」의 곡 목록에서 곡마다 「가사」(.srt/.lrc)를 넣으면 화면에 나옵니다."}</p>
            <div className="grid grid-cols-2 gap-2">
              {([["color", "색 강조"], ["karaoke", "노래방 채움"]] as const).map(([m, label]) => (
                <button key={m} onClick={() => setSettings((p) => ({ ...p, lyricsMode: m }))} className={`py-1.5 text-[11px] font-bold rounded-lg border ${settings.lyricsMode === m ? "bg-[#ff0000] text-white border-[#ff0000]" : "bg-[#212121] text-[#aaaaaa] border-[#272727] hover:text-white"}`}>{label}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-[#aaaaaa]">
              <div className="space-y-1">
                <div className="flex justify-between"><span>글자 크기</span><span className="text-white font-mono">{settings.lyricsSize}</span></div>
                <input type="range" min={30} max={96} value={settings.lyricsSize} onChange={(e) => setSettings((p) => ({ ...p, lyricsSize: Number(e.target.value) }))} className="w-full h-1.5 bg-[#272727] rounded-lg appearance-none cursor-pointer accent-[#ff0000]" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between"><span>세로 위치</span><span className="text-white font-mono">{settings.lyricsY}%</span></div>
                <input type="range" min={15} max={95} value={settings.lyricsY} onChange={(e) => setSettings((p) => ({ ...p, lyricsY: Number(e.target.value) }))} className="w-full h-1.5 bg-[#272727] rounded-lg appearance-none cursor-pointer accent-[#ff0000]" />
              </div>
              <label className="space-y-1">글자 색<input type="color" value={settings.lyricsColor} onChange={(e) => setSettings((p) => ({ ...p, lyricsColor: e.target.value }))} className="block w-full h-7 rounded bg-transparent" /></label>
              <label className="space-y-1">강조 색<input type="color" value={settings.lyricsAccent} onChange={(e) => setSettings((p) => ({ ...p, lyricsAccent: e.target.value }))} className="block w-full h-7 rounded bg-transparent" /></label>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#aaaaaa]"><input type="checkbox" checked={settings.lyricsNext} onChange={(e) => setSettings((p) => ({ ...p, lyricsNext: e.target.checked }))} />다음 줄도 흐리게 보여 주기</label>
          </div>

          {/* 채널 로고 배치 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#aaaaaa]">채널 로고 배치</h4>
            <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-[#aaaaaa]">
              <div className="space-y-1">
                <div className="flex justify-between"><span>X 위치</span><span className="text-white font-mono">{settings.logoX}%</span></div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.logoX}
                  onChange={(e) => setSettings((p) => ({ ...p, logoX: Number(e.target.value) }))}
                  className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between"><span>Y 위치</span><span className="text-white font-mono">{settings.logoY}%</span></div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.logoY}
                  onChange={(e) => setSettings((p) => ({ ...p, logoY: Number(e.target.value) }))}
                  className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-[#aaaaaa]">
                <span>로고 크기</span>
                <span className="text-white font-mono">{settings.logoSize}PX</span>
              </div>
              <input
                type="range"
                min="30"
                max="250"
                value={settings.logoSize}
                onChange={(e) => setSettings((p) => ({ ...p, logoSize: Number(e.target.value) }))}
                className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-[#aaaaaa] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.logoShadowEnabled}
                onChange={(e) => setSettings((p) => ({ ...p, logoShadowEnabled: e.target.checked }))}
                className="rounded accent-[#ff0000]"
              />
              <span>입체 그림자 효과</span>
            </label>
          </div>

          {/* GIF 스티커 배치 */}
          <div className="space-y-3 pt-3 border-t border-[#272727]">
            <h4 className="text-xs font-bold text-[#aaaaaa]">GIF 스티커 배치</h4>
            <label className="flex items-center gap-2 text-xs font-bold text-[#aaaaaa] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.gifCentered}
                onChange={(e) => setSettings((p) => ({ ...p, gifCentered: e.target.checked }))}
                className="rounded accent-[#ff0000]"
              />
              <span>정중앙 정렬</span>
            </label>
            {!settings.gifCentered && (
              <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-[#aaaaaa]">
                <div className="space-y-1">
                  <div className="flex justify-between"><span>X 위치</span><span className="text-white font-mono">{settings.gifX}%</span></div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.gifX}
                    onChange={(e) => setSettings((p) => ({ ...p, gifX: Number(e.target.value) }))}
                    className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between"><span>Y 위치</span><span className="text-white font-mono">{settings.gifY}%</span></div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.gifY}
                    onChange={(e) => setSettings((p) => ({ ...p, gifY: Number(e.target.value) }))}
                    className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-[#aaaaaa]">
                <span>크기</span>
                <span className="text-white font-mono">{settings.gifSize}PX</span>
              </div>
              <input
                type="range"
                min="50"
                max="350"
                value={settings.gifSize}
                onChange={(e) => setSettings((p) => ({ ...p, gifSize: Number(e.target.value) }))}
                className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-[#aaaaaa]">
                <span>투명도</span>
                <span className="text-white font-mono">{settings.gifOpacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.gifOpacity}
                onChange={(e) => setSettings((p) => ({ ...p, gifOpacity: Number(e.target.value) }))}
                className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
              />
            </div>
          </div>

          {/* 메인 컬러 팔레트 (18색) */}
          <div className="space-y-3 pt-3 border-t border-[#272727]">
            <h4 className="text-xs font-bold text-[#aaaaaa]">메인 컬러 팔레트</h4>
            <div className="grid grid-cols-6 gap-2">
              {PALETTE_PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSettings((p) => ({ ...p, primaryColor: color }))}
                  style={{ backgroundColor: color }}
                  className={`w-7 h-7 rounded-full border border-[#272727] transition-transform ${
                    settings.primaryColor === color ? "scale-125 ring-2 ring-[#ff0000] ring-offset-1 ring-offset-[#181818]" : "hover:scale-110"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 스펙트럼 배치 및 크기 */}
          <div className="space-y-3 pt-3 border-t border-[#272727]">
            <h4 className="text-xs font-bold text-[#aaaaaa]">스펙트럼 배치 및 크기</h4>
            <label className="flex items-center gap-2 text-xs font-bold text-[#aaaaaa] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.spectrumCentered}
                onChange={(e) => setSettings((p) => ({ ...p, spectrumCentered: e.target.checked }))}
                className="rounded accent-[#ff0000]"
              />
              <span>정중앙 정렬</span>
            </label>

            {/* 원형 선택 시 원형 반경 슬라이더 동적 노출! */}
            {settings.visualizerType === 'CIRCLE' && (
              <div className="space-y-1 p-2.5 rounded-xl bg-red-950/40 border border-red-900/40">
                <div className="flex justify-between text-[11px] font-bold text-[#ff4e45]">
                  <span>원형 반경</span>
                  <span className="font-mono text-white">{settings.circleRadius}PX</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="300"
                  value={settings.circleRadius}
                  onChange={(e) => setSettings((p) => ({ ...p, circleRadius: Number(e.target.value) }))}
                  className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
                />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-[#aaaaaa]">
                <span>전체 폭 (WIDTH)</span>
                <span className="text-white font-mono">{settings.spectrumWidth}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={settings.spectrumWidth}
                onChange={(e) => setSettings((p) => ({ ...p, spectrumWidth: Number(e.target.value) }))}
                className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-[#aaaaaa]">
                <span>반응 속도</span>
                <span className="text-white font-mono">{settings.reactionSpeed}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={settings.reactionSpeed}
                onChange={(e) => setSettings((p) => ({ ...p, reactionSpeed: Number(e.target.value) }))}
                className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-[#aaaaaa]">
                <span>반응 민감도</span>
                <span className="text-white font-mono">{settings.sensitivity}</span>
              </div>
              <input
                type="range"
                min="20"
                max="150"
                value={settings.sensitivity}
                onChange={(e) => setSettings((p) => ({ ...p, sensitivity: Number(e.target.value) }))}
                className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-[#aaaaaa]">
                <span>주파수 대역</span>
                <span className="text-white font-mono">{settings.barCount}</span>
              </div>
              <input
                type="range"
                min="16"
                max="128"
                step="8"
                value={settings.barCount}
                onChange={(e) => setSettings((p) => ({ ...p, barCount: Number(e.target.value) }))}
                className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-[#aaaaaa]">
                <span>최대 높이</span>
                <span className="text-white font-mono">{settings.spectrumHeight}</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                value={settings.spectrumHeight}
                onChange={(e) => setSettings((p) => ({ ...p, spectrumHeight: Number(e.target.value) }))}
                className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-[#aaaaaa]">
                <span>선 두께</span>
                <span className="text-white font-mono">{settings.barThickness}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={settings.barThickness}
                onChange={(e) => setSettings((p) => ({ ...p, barThickness: Number(e.target.value) }))}
                className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-[#aaaaaa]">
                <span>투명도</span>
                <span className="text-white font-mono">{settings.visualizerOpacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.visualizerOpacity}
                onChange={(e) => setSettings((p) => ({ ...p, visualizerOpacity: Number(e.target.value) }))}
                className="w-full h-1 bg-[#272727] rounded appearance-none cursor-pointer accent-[#ff0000]"
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
