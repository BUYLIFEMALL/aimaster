import type { LyricLine } from "@/lib/lyrics";

export interface Track {
  id: string;
  name: string;
  artist?: string;
  duration: number; // seconds
  url: string;
  file?: File;
  size?: number;
  /** v1.17 곡별 가사 시간표(.srt/.lrc) — 시간 있는 줄만 영상에 나온다 */
  lyrics?: LyricLine[];
  lyricsName?: string;
}

export type VisualizerType =
  | 'NONE'
  | 'BARS'
  | 'SYMMETRIC'
  | 'MINI_BARS'
  | 'CIRCLE'
  | 'LINE'
  | 'WAVEFORM'
  | 'FILLED_WAVE'
  | 'RADIAL_WAVE'
  | 'SPECTRUM_DUAL';

export type FilterType =
  | 'NONE'
  | 'CINEMATIC'
  | 'VINTAGE'
  | 'NOIR'
  | 'DREAMY'
  | 'VIVID'
  | 'CYBERPUNK'
  | 'PSYCHEDELIC';

export type ColorPreset =
  | 'DEFAULT'
  | 'NEON_ICE'
  | 'SUNSET'
  | 'FOREST'
  | 'VIBRANT';

export interface ParticleItem {
  id: string;
  label: string;
  icon: string;
}

export type LyricsMode = 'color' | 'karaoke';

export interface StudioSettings {
  // v1.17 가사 표시(곡별 가사가 있을 때)
  lyricsEnabled: boolean;
  lyricsSize: number; // 1080 기준 글자 크기(px)
  lyricsY: number; // 화면 높이 대비 위치 %
  lyricsColor: string;
  lyricsAccent: string;
  lyricsMode: LyricsMode;
  lyricsNext: boolean; // 다음 줄 흐리게 함께

  // Visualizer Core
  visualizerType: VisualizerType;
  barCount: number;
  barWidth: number;
  barThickness: number;
  spectrumHeight: number;
  spectrumWidth: number;
  visualizerOpacity: number;
  colorPreset: ColorPreset;
  cornerRadius: number;
  primaryColor: string;
  secondaryColor: string;
  sensitivity: number;
  reactionSpeed: number;
  spectrumX: number;
  spectrumY: number;
  spectrumCentered: boolean;
  circleRadius: number;

  // Mini Bars Only
  miniBarsX: number;
  miniBarsY: number;
  miniBarsWidth: number;
  miniBarsSize: number;
  miniBarsCentered: boolean;

  // Filter & Vignette
  filterType: FilterType;
  filterIntensity: number;
  brightness: number;
  vignette: boolean;
  vignetteIntensity: number;

  // 14 Particles
  waterDrops: boolean;
  sparkles: boolean;
  neonShapes: boolean;
  hearts: boolean;
  embers: boolean;
  snow: boolean;
  rain: boolean;
  confetti: boolean;
  laserBeams: boolean;
  bokeh: boolean;
  lightning: boolean;
  shards: boolean;
  cyberLines: boolean;
  musicNotes: boolean;
  overlayDensity: number;
  overlaySpeed: number;
  overlaySize: number;
  overlayOpacity: number;
  overlayColor: string;
  overlayColorPreset: ColorPreset;
  waterDirection: 'down' | 'up' | 'left' | 'right';

  // Trendy FX & Motions
  filmGrain: boolean;
  filmGrainIntensity: number;
  vhsEffect: boolean;
  vhsIntensity: number;
  lightLeaks: boolean;
  lightLeaksIntensity: number;
  chromaticAberration: boolean;
  scanlines: boolean;
  mirrorEffect: boolean;
  zoomPulse: boolean;
  pulseEnabled: boolean;
  pulseIntensity: number;
  shakeEnabled: boolean;
  shakeIntensity: number;

  // Party / EDM FX
  clubLighting: boolean;
  strobeFlash: boolean;
  strobeIntensity: number;
  bassRipples: boolean;
  bassRipplesIntensity: number;
  neonTunnel: boolean;
  glitchBeat: boolean;
  glitchBeatIntensity: number;
  colorFrenzy: boolean;
  colorFrenzyIntensity: number;
  rgbShift: boolean;
  rgbShiftIntensity: number;

  // Channel Logo
  logoUrl: string | null;
  logoX: number;
  logoY: number;
  logoSize: number;
  logoOpacity: number;
  removeLogoBackground: boolean;
  logoTolerance: number;
  logoShadowEnabled: boolean;
  logoShadowSize: number;

  // GIF Sticker
  gifUrl: string | null;
  gifX: number;
  gifY: number;
  gifSize: number;
  gifOpacity: number;
  gifCentered: boolean;
  gifShadowEnabled: boolean;
  gifShadowSize: number;
}

export interface ExportSettings {
  resolution: '1080p' | '720p';
  fps: number; // 30 or 60
  format: 'MP4';
  audioBitrate: number; // 96000, 128000, 192000, 320000
  repeatCount: number; // 1, 2, 3, 5
  aspect: '16:9' | '9:16'; // v1.17 세로(쇼츠) 영상
}
