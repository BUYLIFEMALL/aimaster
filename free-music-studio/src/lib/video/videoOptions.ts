// 플레이리스트 영상 설정 — 원본 boks-music `electron/playlist-video.mjs`·`video-template-registry.mjs`·`canvas-render`(MIT, © 2026 boksajang)를 옮김.
// 템플릿 37개는 원본 video-templates/*/template.json을 하나로 묶은 templates.ts(정적 목록).
import { TEMPLATE_LIST } from "./templates";
import { SPECTRUM_STYLES } from "./video-spectrum.mjs";

export type VideoMode = "vocal" | "instrumental";
export type VideoTemplate = {
  id: string;
  name: string;
  description: string;
  order: number;
  scene: string;
  maxResolution?: number;
  requiresBackground?: boolean;
  aspects: string[];
  spectra: string[];
  recommendedSpectrum?: string;
  modes?: VideoMode[];
};
export type VideoOptions = {
  aspect: "16:9" | "9:16";
  resolution: 480 | 720 | 1080 | 1440 | 2160 | 4320;
  fps: 24 | 25 | 30 | 50 | 60;
  format: "mp4" | "mov";
  template: string;
  spectrum: string;
  color: "mono" | "gradient" | "rainbow";
  mode: VideoMode;
  repeat: number;
  normalize: boolean;
  brand?: string;
  playlistTitle?: string;
};
export type ResolvedVideoOptions = VideoOptions & { width: number; height: number };

export const VIDEO_TEMPLATES: VideoTemplate[] = (TEMPLATE_LIST as VideoTemplate[]).slice().sort((a, b) => a.order - b.order);
export { SPECTRUM_STYLES };
export const RESOLUTIONS = [480, 720, 1080, 1440, 2160] as const; // 4320은 원본에 있으나 브라우저 인코더가 대부분 못 해 고르지 않게 둠
export const FPS_LIST = [24, 25, 30, 50, 60] as const;
export const COLOR_LABEL: Record<VideoOptions["color"], string> = { mono: "단색", gradient: "그라데이션", rainbow: "무지개" };
export const MODE_LABEL: Record<VideoMode, string> = { vocal: "가사 영상", instrumental: "연주곡 영상" };

export const DEFAULT_VIDEO_OPTIONS: VideoOptions = {
  aspect: "16:9",
  resolution: 1080,
  fps: 30,
  format: "mp4",
  template: "albumblur",
  spectrum: "bars",
  color: "mono",
  mode: "instrumental",
  repeat: 1,
  normalize: false,
  brand: "MY PLAYLIST",
  playlistTitle: "",
};

export const templateOf = (id: string) => VIDEO_TEMPLATES.find((t) => t.id === id) ?? null;
export const templateModes = (t: VideoTemplate): VideoMode[] => t.modes ?? ["vocal", "instrumental"];

/** 원본 validateVideoOptions — 템플릿이 받는 비율·스펙트럼·모드·최대 해상도를 확인하고 실제 가로·세로를 붙인다 */
export function validateVideoOptions(input: Partial<VideoOptions> = {}): ResolvedVideoOptions {
  const legacy: Record<string, string> = { "cinematic-gpu": "cinematic" };
  // 비어 있는(undefined) 값이 기본값을 덮지 않게(원본의 input.x ?? 기본값과 같게)
  const given = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as Partial<VideoOptions>;
  const o = { ...DEFAULT_VIDEO_OPTIONS, ...given, template: legacy[given.template ?? ""] ?? given.template ?? DEFAULT_VIDEO_OPTIONS.template };
  const template = templateOf(o.template);
  if (!template) throw new Error("없는 영상 템플릿입니다.");
  const line = (value: unknown, label: string, max: number) => {
    if (value === undefined) return undefined;
    if (typeof value !== "string") throw new Error(`${label} 형식이 올바르지 않습니다.`);
    const clean = value.replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim();
    if (clean.length > max) throw new Error(`${label}은(는) ${max}자 이내로 입력하세요.`);
    return clean;
  };
  const brand = line(o.brand, "타이틀 문구", 40);
  const playlistTitle = line(o.playlistTitle, "영상 이름", 180);
  if (!templateModes(template).includes(o.mode)) throw new Error(`${template.name} 템플릿은 ${o.mode === "vocal" ? "가사 영상" : "연주곡 영상"}에 쓸 수 없습니다.`);
  if (
    !template.aspects.includes(o.aspect) ||
    !template.spectra.includes(o.spectrum) ||
    ![480, 720, 1080, 1440, 2160, 4320].includes(o.resolution) ||
    !(FPS_LIST as readonly number[]).includes(o.fps) ||
    !["mp4", "mov"].includes(o.format) ||
    !SPECTRUM_STYLES.some((s) => s.id === o.spectrum) ||
    !["mono", "gradient", "rainbow"].includes(o.color) ||
    !Number.isInteger(o.repeat) ||
    o.repeat < 1 ||
    o.repeat > 20
  ) {
    throw new Error("지원하지 않는 영상 설정입니다.");
  }
  if (template.maxResolution && o.resolution > template.maxResolution) throw new Error(`이 템플릿은 최대 ${template.maxResolution}p까지 지원합니다.`);
  const short = o.resolution;
  const long = Math.round((short * 16) / 9 / 2) * 2;
  return { ...o, brand, playlistTitle, width: o.aspect === "16:9" ? long : short, height: o.aspect === "16:9" ? short : long };
}

/** 템플릿을 바꿀 때 맞지 않는 설정을 그 템플릿에 맞춘다(비율·스펙트럼·모드·해상도) */
export function fitToTemplate(o: VideoOptions, t: VideoTemplate): VideoOptions {
  const modes = templateModes(t);
  return {
    ...o,
    template: t.id,
    aspect: t.aspects.includes(o.aspect) ? o.aspect : (t.aspects[0] as VideoOptions["aspect"]),
    spectrum: t.spectra.includes(o.spectrum) ? o.spectrum : (t.recommendedSpectrum ?? t.spectra[0]),
    mode: modes.includes(o.mode) ? o.mode : modes[0],
    resolution: t.maxResolution && o.resolution > t.maxResolution ? (t.maxResolution as VideoOptions["resolution"]) : o.resolution,
  };
}

/** H.264 High 프로필 레벨 — 원본 canvas-render/page.mjs (4.0 → 1080p30, 4.2 → 1080p60, 5.1 → 4K30, 5.2 → 4K60) */
export function h264Codec({ width, height, fps }: { width: number; height: number; fps: number }): string {
  const area = width * height;
  const rate = area * fps;
  const level = rate <= 1920 * 1088 * 30 ? "28" : area <= 1920 * 1088 && rate <= 1920 * 1088 * 64 ? "2A" : rate <= 4096 * 2304 * 30 ? "33" : "34";
  return `avc1.6400${level}`;
}
/** 원본 canvasBitrate(프레임당 픽셀당 약 0.15bit, 2.5~80Mbps) */
export const canvasBitrate = ({ width, height, fps }: { width: number; height: number; fps: number }) => Math.round(Math.min(80e6, Math.max(2.5e6, width * height * fps * 0.15)));

/** 「0:00 제목」 — 유튜브 설명란에 붙이는 챕터(1시간 넘으면 1:02:03) */
export function chapterText(chapters: { start: number; title: string }[]): string {
  const stamp = (s: number) => {
    const t = Math.floor(s);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const sec = String(t % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
  };
  return chapters.map((c) => `${stamp(c.start)} ${c.title}`).join("\n");
}
