export interface Track {
  id: string;
  name: string;
  artist?: string;
  duration: number; // seconds
  url: string;
  file?: File;
  size?: number;
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

export interface StudioSettings {
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
}
