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
}: EditorStudioProps) {
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
        ctx.drawImage(bgImgRef.current, 0, 0, width, height);
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
  }, [settings, isPlaying]);

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100/70">
      {/* 1. 상단 액션 바 */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm md:text-base">편집 스튜디오</h2>
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
              EDITOR WORKFLOW ACTIVE
            </p>
          </div>
        </div>

        <button
          onClick={onExportClick}
          disabled={isExporting || tracks.length === 0}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all ${
            isExporting
              ? "bg-indigo-400 text-white cursor-wait"
              : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-indigo-500/20"
          }`}
        >
          <Video className="w-4 h-4" />
          {isExporting ? (
            <span>비디오 내보내기 {exportProgress}%</span>
          ) : (
            <span>비디오 내보내기</span>
          )}
        </button>
      </header>

      {/* 2. 3단 메인 작업 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 패널: 스펙트럼, 필터, 오버레이, 파티클 */}
        <aside className="w-80 bg-white border-r border-slate-200 overflow-y-auto p-5 space-y-6 shrink-0 custom-scrollbar">
          {/* 오디오 스펙트럼 10종 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
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
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Disc3 className={`w-3.5 h-3.5 shrink-0 ${settings.visualizerType === opt.type ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 배경 필터 & 비네팅 */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              배경 필터 & 비네팅
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {FILTER_OPTIONS.map((f) => (
                <button
                  key={f.type}
                  onClick={() => setSettings((prev) => ({ ...prev, filterType: f.type }))}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                    settings.filterType === f.type
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* 필터 슬라이더 3종 */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>필터 강도</span>
                  <span>{settings.filterIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.filterIntensity}
                  onChange={(e) => setSettings((prev) => ({ ...prev, filterIntensity: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>배경 밝기</span>
                  <span>{settings.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="180"
                  value={settings.brightness}
                  onChange={(e) => setSettings((prev) => ({ ...prev, brightness: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>비네팅 세기</span>
                  <span>{settings.vignetteIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.vignetteIntensity}
                  onChange={(e) => setSettings((prev) => ({ ...prev, vignetteIntensity: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* 트렌디 오버레이 10종 */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
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
                        ? "bg-purple-50 border-purple-500 text-purple-700 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{ov.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 파티 모드 (EDM 전용) */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
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
                        ? "bg-rose-50 border-rose-500 text-rose-700 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{pt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 스타일 파티클 14종 */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
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
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{po.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 효과 컬러 (공통) */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-slate-600">효과 컬러 (공통)</span>
              <div className="flex items-center gap-2">
                {EFFECT_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSettings((prev) => ({ ...prev, overlayColor: color }))}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-full border border-slate-200 transition-transform ${
                      settings.overlayColor === color ? "scale-125 ring-2 ring-indigo-500 ring-offset-1" : "hover:scale-110"
                    }`}
                  />
                ))}
                <input
                  type="text"
                  value={settings.overlayColor}
                  onChange={(e) => setSettings((prev) => ({ ...prev, overlayColor: e.target.value }))}
                  className="w-20 px-2 py-1 text-[11px] font-mono font-bold border border-slate-200 rounded-lg text-slate-700"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* 중앙: 16:9 캔버스 및 오디오 플레이어 바 */}
        <main className="flex-1 flex flex-col items-center justify-between p-6 overflow-hidden">
          {/* 상단 16:9 대형 캔버스 */}
          <div className="w-full flex-1 flex items-center justify-center min-h-0">
            <div className="relative w-full max-w-4xl aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center group">
              <canvas
                ref={canvasRef}
                width={1920}
                height={1080}
                className="w-full h-full object-contain"
              />

              {/* 재생/일시정지 큰 오버레이 버튼 */}
              <button
                onClick={togglePlay}
                className="absolute w-16 h-16 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center backdrop-blur-xs transition-transform hover:scale-110 shadow-lg cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7" />
                ) : (
                  <Play className="w-7 h-7 ml-1" />
                )}
              </button>
            </div>
          </div>

          {/* 캔버스 하단 트랙 셀렉터 & 하단 플레이어 바 */}
          <div className="w-full max-w-4xl mt-4 space-y-3">
            {/* 트랙 선택 드롭다운 */}
            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-500">재생 트랙 선택</span>
              <select
                value={currentTrackIndex}
                onChange={(e) => {
                  setCurrentTrackIndex(Number(e.target.value));
                  setIsPlaying(false);
                }}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
              >
                {tracks.map((t, idx) => (
                  <option key={t.id} value={idx}>
                    {idx + 1}. {t.name} ({formatSec(t.duration)})
                  </option>
                ))}
              </select>
            </div>

            {/* 하단 오디오 플레이어 바 */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-xs shrink-0 transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span className="truncate">{currentTrack?.name || "선택된 곡 없음"}</span>
                  <span className="text-slate-400 font-mono text-[11px]">
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
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          </div>
        </main>

        {/* 우측 패널: 레이아웃 조정, 채널 로고, GIF 스티커, 메인 컬러, 스펙트럼 세부배치 */}
        <aside className="w-80 bg-white border-l border-slate-200 overflow-y-auto p-5 space-y-6 shrink-0 custom-scrollbar">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            레이아웃 조정
          </h3>

          {/* 채널 로고 배치 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700">채널 로고 배치</h4>
            <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-slate-600">
              <div className="space-y-1">
                <div className="flex justify-between"><span>X 위치</span><span>{settings.logoX}%</span></div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.logoX}
                  onChange={(e) => setSettings((p) => ({ ...p, logoX: Number(e.target.value) }))}
                  className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between"><span>Y 위치</span><span>{settings.logoY}%</span></div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.logoY}
                  onChange={(e) => setSettings((p) => ({ ...p, logoY: Number(e.target.value) }))}
                  className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>로고 크기</span>
                <span>{settings.logoSize}PX</span>
              </div>
              <input
                type="range"
                min="30"
                max="250"
                value={settings.logoSize}
                onChange={(e) => setSettings((p) => ({ ...p, logoSize: Number(e.target.value) }))}
                className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.logoShadowEnabled}
                onChange={(e) => setSettings((p) => ({ ...p, logoShadowEnabled: e.target.checked }))}
                className="rounded text-indigo-600"
              />
              <span>입체 그림자 효과</span>
            </label>
          </div>

          {/* GIF 스티커 배치 */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700">GIF 스티커 배치</h4>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.gifCentered}
                onChange={(e) => setSettings((p) => ({ ...p, gifCentered: e.target.checked }))}
                className="rounded text-indigo-600"
              />
              <span>정중앙 정렬</span>
            </label>
            {!settings.gifCentered && (
              <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-slate-600">
                <div className="space-y-1">
                  <div className="flex justify-between"><span>X 위치</span><span>{settings.gifX}%</span></div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.gifX}
                    onChange={(e) => setSettings((p) => ({ ...p, gifX: Number(e.target.value) }))}
                    className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between"><span>Y 위치</span><span>{settings.gifY}%</span></div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.gifY}
                    onChange={(e) => setSettings((p) => ({ ...p, gifY: Number(e.target.value) }))}
                    className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>크기</span>
                <span>{settings.gifSize}PX</span>
              </div>
              <input
                type="range"
                min="50"
                max="350"
                value={settings.gifSize}
                onChange={(e) => setSettings((p) => ({ ...p, gifSize: Number(e.target.value) }))}
                className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>투명도</span>
                <span>{settings.gifOpacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.gifOpacity}
                onChange={(e) => setSettings((p) => ({ ...p, gifOpacity: Number(e.target.value) }))}
                className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* 메인 컬러 팔레트 (18색) */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700">메인 컬러 팔레트</h4>
            <div className="grid grid-cols-6 gap-2">
              {PALETTE_PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSettings((p) => ({ ...p, primaryColor: color }))}
                  style={{ backgroundColor: color }}
                  className={`w-7 h-7 rounded-full border border-slate-200 transition-transform ${
                    settings.primaryColor === color ? "scale-125 ring-2 ring-indigo-500 ring-offset-1" : "hover:scale-110"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 스펙트럼 배치 및 크기 */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700">스펙트럼 배치 및 크기</h4>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.spectrumCentered}
                onChange={(e) => setSettings((p) => ({ ...p, spectrumCentered: e.target.checked }))}
                className="rounded text-indigo-600"
              />
              <span>정중앙 정렬</span>
            </label>

            {/* 원형 선택 시 원형 반경 슬라이더 동적 노출! */}
            {settings.visualizerType === 'CIRCLE' && (
              <div className="space-y-1 p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <div className="flex justify-between text-[11px] font-bold text-indigo-900">
                  <span>원형 반경</span>
                  <span>{settings.circleRadius}PX</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="300"
                  value={settings.circleRadius}
                  onChange={(e) => setSettings((p) => ({ ...p, circleRadius: Number(e.target.value) }))}
                  className="w-full h-1 bg-indigo-200 rounded appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>전체 폭 (WIDTH)</span>
                <span>{settings.spectrumWidth}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={settings.spectrumWidth}
                onChange={(e) => setSettings((p) => ({ ...p, spectrumWidth: Number(e.target.value) }))}
                className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>반응 속도</span>
                <span>{settings.reactionSpeed}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={settings.reactionSpeed}
                onChange={(e) => setSettings((p) => ({ ...p, reactionSpeed: Number(e.target.value) }))}
                className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>반응 민감도</span>
                <span>{settings.sensitivity}</span>
              </div>
              <input
                type="range"
                min="20"
                max="150"
                value={settings.sensitivity}
                onChange={(e) => setSettings((p) => ({ ...p, sensitivity: Number(e.target.value) }))}
                className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>주파수 대역</span>
                <span>{settings.barCount}</span>
              </div>
              <input
                type="range"
                min="16"
                max="128"
                step="8"
                value={settings.barCount}
                onChange={(e) => setSettings((p) => ({ ...p, barCount: Number(e.target.value) }))}
                className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>최대 높이</span>
                <span>{settings.spectrumHeight}</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                value={settings.spectrumHeight}
                onChange={(e) => setSettings((p) => ({ ...p, spectrumHeight: Number(e.target.value) }))}
                className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>선 두께</span>
                <span>{settings.barThickness}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={settings.barThickness}
                onChange={(e) => setSettings((p) => ({ ...p, barThickness: Number(e.target.value) }))}
                className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>투명도</span>
                <span>{settings.visualizerOpacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.visualizerOpacity}
                onChange={(e) => setSettings((p) => ({ ...p, visualizerOpacity: Number(e.target.value) }))}
                className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
