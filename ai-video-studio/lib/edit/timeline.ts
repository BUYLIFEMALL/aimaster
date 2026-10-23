// 2차 영상 합치기 — 편집 구성과 시간 계산(순수 함수, Remotion에 의존하지 않음).
// 그리기 층(Remotion)을 나중에 다른 엔진으로 바꿔도 이 파일은 그대로 쓴다(루트 docs/PLAN_20261023_FREE_VIDEO_RENDERING.md 8절).
export type EditAspect = "9:16" | "16:9" | "1:1";
export type EditQuality = "720p" | "1080p";
export type CaptionPosition = "top" | "middle" | "bottom";
/** 쇼츠 원스톱 CAPTION_STYLES와 같은 이름 */
export type CaptionStyle = "band" | "yellow" | "outline" | "pop";
export type Transition = "none" | "fade";

export const FPS = 30;
export const MAX_CLIPS = 20;
export const MAX_TOTAL_S = 180;
export const MIN_CLIP_S = 0.5;
export const FADE_S = 0.3;
export const MUSIC_FADE_S = 1;

export const CAPTION_STYLE_NAMES: Record<CaptionStyle, string> = { band: "기본(어두운 띠)", yellow: "노란 자막", outline: "외곽선", pop: "강조 색" };

export interface EditClip {
  id: string;
  /** 브라우저 안 blob: 주소(갤러리 영상도 받아서 blob으로 바꿔 넣는다) */
  src: string;
  name: string;
  /** 원본 길이(초) */
  duration: number;
  /** 앞·뒤에서 잘라낼 초 */
  trimStart: number;
  trimEnd: number;
  caption: string;
}

export interface EditMusic {
  src: string;
  name: string;
  /** 0~1 */
  volume: number;
  fadeOut: boolean;
}

export interface EditProject {
  clips: EditClip[];
  aspect: EditAspect;
  quality: EditQuality;
  transition: Transition;
  captionPosition: CaptionPosition;
  captionStyle: CaptionStyle;
  /** 넣은 영상의 원래 소리(AI 클립은 대부분 소리 없음) */
  clipAudio: boolean;
  music: EditMusic | null;
}

/** 자막 한 줄 최대 글자 수(화면 비율별) — SVG 글자는 자동 줄바꿈이 없어서 직접 나눈다 */
export function captionMaxChars(aspect: EditAspect): number {
  return aspect === "16:9" ? 24 : aspect === "1:1" ? 18 : 14;
}

/** 띄어쓰기 기준으로 줄을 나누고, 너무 긴 낱말은 글자 수로 자른다. 최대 3줄 */
export function wrapCaption(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (let w of words) {
    while (w.length > maxChars) {
      if (cur) { lines.push(cur); cur = ""; }
      lines.push(w.slice(0, maxChars));
      w = w.slice(maxChars);
    }
    if (!w) continue;
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += ` ${w}`;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export interface Segment {
  clip: EditClip;
  /** 결과 영상에서 시작 프레임 */
  from: number;
  durationInFrames: number;
  /** 원본에서 건너뛸 프레임(앞 자르기) */
  trimBeforeFrames: number;
}

export function dimensions(aspect: EditAspect, quality: EditQuality): { width: number; height: number } {
  const short = quality === "1080p" ? 1080 : 720;
  const long = quality === "1080p" ? 1920 : 1280;
  if (aspect === "9:16") return { width: short, height: long };
  if (aspect === "16:9") return { width: long, height: short };
  return { width: short, height: short };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 자르기를 반영한 클립 길이(초). 잘못된 값은 고쳐서 최소 0.5초를 남긴다 */
export function clipSeconds(c: Pick<EditClip, "duration" | "trimStart" | "trimEnd">): number {
  const d = Number.isFinite(c.duration) && c.duration > 0 ? c.duration : 0;
  if (d <= MIN_CLIP_S) return d;
  const start = clamp(Number(c.trimStart) || 0, 0, d - MIN_CLIP_S);
  const end = clamp(Number(c.trimEnd) || 0, 0, d - start - MIN_CLIP_S);
  return d - start - end;
}

/** 클립을 순서대로 이어 붙인 배치. 장면 전환은 겹치지 않는 「검은 화면으로 페이드」라 길이에 영향이 없다 */
export function layout(p: Pick<EditProject, "clips">): { segments: Segment[]; totalFrames: number } {
  const segments: Segment[] = [];
  let from = 0;
  for (const clip of p.clips) {
    const frames = Math.max(1, Math.round(clipSeconds(clip) * FPS));
    const d = Number.isFinite(clip.duration) ? clip.duration : 0;
    const trimStart = clamp(Number(clip.trimStart) || 0, 0, Math.max(0, d - MIN_CLIP_S));
    segments.push({ clip, from, durationInFrames: frames, trimBeforeFrames: Math.round(trimStart * FPS) });
    from += frames;
  }
  return { segments, totalFrames: Math.max(1, from) };
}

export function totalSeconds(p: Pick<EditProject, "clips">): number {
  return p.clips.reduce((s, c) => s + clipSeconds(c), 0);
}

/** 장면 안 프레임(0부터)의 불투명도 — 앞뒤 FADE_S 동안 검은 화면에서 나타나고 사라진다 */
export function fadeOpacity(frameInSegment: number, durationInFrames: number, transition: Transition): number {
  if (transition !== "fade") return 1;
  const f = Math.max(1, Math.round(FADE_S * FPS));
  const edge = Math.min(f, Math.floor(durationInFrames / 2));
  if (edge <= 0) return 1;
  const fin = frameInSegment / edge;
  const fout = (durationInFrames - 1 - frameInSegment) / edge;
  return clamp(Math.min(fin, fout, 1), 0, 1);
}

/** 배경음악 음량 — 끝 MUSIC_FADE_S 동안 0으로 줄인다 */
export function musicVolume(frame: number, totalFrames: number, volume: number, fadeOut: boolean): number {
  const v = clamp(volume, 0, 1);
  if (!fadeOut) return v;
  const f = Math.round(MUSIC_FADE_S * FPS);
  const left = totalFrames - frame;
  return left >= f ? v : clamp((left / f) * v, 0, v);
}

/** 렌더 전 검사 — 문제가 있으면 쉬운 한국어 안내, 없으면 null */
export function validate(p: EditProject): string | null {
  if (!p.clips.length) return "합칠 영상을 1개 이상 넣어 주세요.";
  if (p.clips.length > MAX_CLIPS) return `영상은 최대 ${MAX_CLIPS}개까지 합칠 수 있습니다.`;
  if (totalSeconds(p) > MAX_TOTAL_S) return `완성 영상은 최대 ${MAX_TOTAL_S / 60}분까지 만들 수 있습니다. 클립을 줄이거나 잘라 주세요.`;
  return null;
}

/** 내려받기 파일 이름(영문) */
export function outputFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `ai-video-edit-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.mp4`;
}
