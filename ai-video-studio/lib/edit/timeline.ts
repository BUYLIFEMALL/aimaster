// [공용 기준 코드 `video-edit-timeline` — 기준: ai-video-studio/lib/edit/timeline.ts, 사본: music-video-studio/src/lib/edit/timeline.ts.
//  사본은 직접 고치지 말고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`]
// 영상 합치기 — 편집 구성과 시간 계산(순수 함수, Remotion에 의존하지 않음).
// 그리기 층(Remotion)을 나중에 다른 엔진으로 바꿔도 이 파일은 그대로 쓴다(루트 docs/PLAN_20261023_FREE_VIDEO_RENDERING.md 8절).
import { timedCaptionChunks, tokensOf } from "./voice";
export type EditAspect = "9:16" | "16:9" | "1:1";
export type EditQuality = "720p" | "1080p";
export type CaptionPosition = "top" | "middle" | "bottom";
/** 쇼츠 원스톱 CAPTION_STYLES와 같은 이름 */
export type CaptionStyle = "band" | "yellow" | "outline" | "pop";
export type Transition = "none" | "fade";
export type CaptionSize = "s" | "m" | "l";
export const CAPTION_SIZE_NAMES: Record<CaptionSize, string> = { s: "작게", m: "보통", l: "크게" };
export const CAPTION_SIZE_SCALE: Record<CaptionSize, number> = { s: 0.8, m: 1, l: 1.25 };

/** 다시 불러올 수 있는 출처(갤러리 생성 번호·AI 음악 스튜디오 곡 번호). 내 PC 파일은 서버에 올리지 않아 다시 넣어야 한다 */
export type ClipSource = { kind: "gallery"; id: string } | { kind: "local" };
export type MusicSource = { kind: "ams"; ref: string } | { kind: "local" };

export interface ClipVoice {
  /** 브라우저 blob: 주소 또는 서명 주소 */
  src: string;
  /** 음성 길이(초) */
  duration: number;
  /** 내레이션 낱말마다 음성에서 시작하는 시각(초). 없으면 글자 수 비례로 자막을 나눈다 */
  starts: number[] | null;
  mime: string;
  /** 저장된 편집에서 불러온 경우 저장소 경로 */
  path?: string;
}

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
  source?: ClipSource;
  /** 장면 종류 — image면 사진을 느리게 확대해 보여 준다(duration = 보여 줄 초). 기본 video */
  kind?: "video" | "image";
  /** 장면이 영상보다 길면 영상을 반복 재생(뮤직비디오: 곡 길이에 맞춘 장면) */
  loop?: boolean;
  /** 이 장면에서 읽을 내레이션 문장(비우면 내레이션 없음) */
  narration?: string;
  voice?: ClipVoice | null;
}

export interface EditMusic {
  src: string;
  name: string;
  /** 0~1 */
  volume: number;
  fadeOut: boolean;
  source?: MusicSource;
  /** 내레이션이 나오는 동안 음악을 줄인다(기본 켬) */
  duck?: boolean;
}

export interface EditProject {
  clips: EditClip[];
  aspect: EditAspect;
  quality: EditQuality;
  transition: Transition;
  captionPosition: CaptionPosition;
  captionStyle: CaptionStyle;
  captionSize?: CaptionSize;
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
/** 내레이션이 나오는 동안 배경음악 음량 비율과 앞뒤로 부드럽게 바꾸는 시간 */
export const DUCK_LEVEL = 0.35;
export const DUCK_RAMP_S = 0.2;

/** 내레이션이 나오는 구간(프레임, 결과 영상 기준 [시작, 끝)) — 장면보다 긴 내레이션은 장면 끝에서 자른다 */
export function duckRanges(p: Pick<EditProject, "clips">): [number, number][] {
  return layout(p).segments
    .filter((s) => s.clip.voice && s.clip.voice.duration > 0)
    .map((s) => [s.from, s.from + Math.min(s.durationInFrames, Math.round((s.clip.voice as ClipVoice).duration * FPS))] as [number, number]);
}

/** 그 프레임의 덕킹 비율(1 = 그대로, DUCK_LEVEL = 내레이션 중) */
export function duckGain(frame: number, ranges: [number, number][]): number {
  const ramp = Math.max(1, Math.round(DUCK_RAMP_S * FPS));
  let g = 1;
  for (const [a, b] of ranges) {
    let k = 0; // 0 = 그대로, 1 = 완전히 줄임
    if (frame >= a && frame < b) k = 1;
    else if (frame >= a - ramp && frame < a) k = (frame - (a - ramp)) / ramp;
    else if (frame >= b && frame < b + ramp) k = 1 - (frame - b) / ramp;
    g = Math.min(g, 1 - k * (1 - DUCK_LEVEL));
  }
  return g;
}

/** 배경음악 음량 — 끝 MUSIC_FADE_S 동안 0으로 줄이고, ranges(내레이션 구간)에서는 DUCK_LEVEL로 줄인다 */
export function musicVolume(frame: number, totalFrames: number, volume: number, fadeOut: boolean, ranges: [number, number][] = []): number {
  const v = clamp(volume, 0, 1) * duckGain(frame, ranges);
  if (!fadeOut) return v;
  const f = Math.round(MUSIC_FADE_S * FPS);
  const left = totalFrames - frame;
  return left >= f ? v : clamp((left / f) * v, 0, v);
}

/** 렌더 전 검사 — 문제가 있으면 쉬운 한국어 안내, 없으면 null */
/** maxTotalS: 프로그램마다 다른 최대 길이(뮤직비디오는 곡 길이 때문에 더 길게) */
export function validate(p: EditProject, maxTotalS: number = MAX_TOTAL_S): string | null {
  if (!p.clips.length) return "합칠 영상을 1개 이상 넣어 주세요.";
  if (p.clips.length > MAX_CLIPS) return `영상은 최대 ${MAX_CLIPS}개까지 합칠 수 있습니다.`;
  if (totalSeconds(p) > maxTotalS) return `완성 영상은 최대 ${maxTotalS / 60}분까지 만들 수 있습니다. 클립을 줄이거나 잘라 주세요.`;
  return null;
}

/** 곡 길이를 장면 수로 나눈 장면 길이(초, 0.1초 단위). 마지막 장면이 나머지를 받아 합이 곡 길이와 같다 */
export function splitEvenly(totalS: number, count: number): number[] {
  if (count <= 0 || !Number.isFinite(totalS) || totalS <= 0) return [];
  const each = Math.floor((totalS / count) * 10) / 10;
  const out = Array.from({ length: count }, () => each);
  out[count - 1] = Math.round((totalS - each * (count - 1)) * 10) / 10;
  return out;
}

/** 내려받기 파일 이름(영문) */
export function outputFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `ai-video-edit-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.mp4`;
}

/** 장면 안 자막 구간(프레임, 장면 시작 기준). 내레이션 음성이 있으면 말하는 속도에 맞춰 나누고, 없으면 자막 한 줄을 장면 내내 보여 준다 */
export function sceneCaptions(clip: EditClip, durationInFrames: number): { text: string; from: number; to: number }[] {
  const narration = (clip.narration ?? "").trim();
  const voice = clip.voice;
  if (voice && narration) {
    const toks = tokensOf(narration);
    let starts = voice.starts && voice.starts.length === toks.length ? voice.starts : null;
    if (!starts) {
      // 받아쓰기 시각이 없으면 글자 수 비례로 나눈다
      const total = toks.reduce((n, w) => n + w.length, 0) || 1;
      let acc = 0;
      starts = toks.map((w) => { const s = (acc / total) * voice.duration; acc += w.length; return s; });
    }
    const chunks = timedCaptionChunks(narration, starts) ?? [];
    const out: { text: string; from: number; to: number }[] = [];
    chunks.forEach((c, i) => {
      const from = Math.min(durationInFrames, Math.max(0, Math.round(c.start * FPS)));
      const next = chunks[i + 1];
      const end = next ? Math.round(next.start * FPS) : Math.round((voice.duration + 0.3) * FPS);
      const to = Math.min(durationInFrames, Math.max(from + 1, end));
      if (from < durationInFrames) out.push({ text: c.text, from, to });
    });
    return out;
  }
  const caption = clip.caption.trim();
  return caption ? [{ text: caption, from: 0, to: durationInFrames }] : [];
}

/** 내레이션이 장면보다 긴 초(0이면 문제 없음) */
export function voiceOverflow(clip: EditClip): number {
  if (!clip.voice) return 0;
  return Math.max(0, Math.round((clip.voice.duration - clipSeconds(clip)) * 10) / 10);
}

// ── 편집 저장 형식(브라우저 blob 주소는 저장하지 않음) ──
export interface SavedClip { id: string; name: string; duration: number; trimStart: number; trimEnd: number; caption: string; narration: string; source: ClipSource; voice: { path: string; duration: number; starts: number[] | null; mime: string } | null }
export interface SavedProject {
  v: 1;
  clips: SavedClip[];
  aspect: EditAspect; quality: EditQuality; transition: Transition; captionPosition: CaptionPosition; captionStyle: CaptionStyle; captionSize: CaptionSize; clipAudio: boolean;
  music: { name: string; volume: number; fadeOut: boolean; source: MusicSource; duck?: boolean } | null;
}

/** 저장용으로 바꾼다. voicePaths: 장면 번호 → 저장소에 올라갈 음성 경로 */
export function toSaved(p: EditProject, voicePaths: Record<string, string>): SavedProject {
  return {
    v: 1,
    clips: p.clips.map((c) => ({
      id: c.id, name: c.name.slice(0, 120), duration: c.duration, trimStart: c.trimStart, trimEnd: c.trimEnd, caption: c.caption.slice(0, 200), narration: (c.narration ?? "").slice(0, 1000),
      source: c.source ?? { kind: "local" },
      voice: c.voice && (voicePaths[c.id] || c.voice.path) ? { path: voicePaths[c.id] || (c.voice.path as string), duration: c.voice.duration, starts: c.voice.starts, mime: c.voice.mime } : null,
    })),
    aspect: p.aspect, quality: p.quality, transition: p.transition, captionPosition: p.captionPosition, captionStyle: p.captionStyle, captionSize: p.captionSize ?? "m", clipAudio: p.clipAudio,
    music: p.music ? { name: p.music.name.slice(0, 120), volume: p.music.volume, fadeOut: p.music.fadeOut, source: p.music.source ?? { kind: "local" }, duck: p.music.duck !== false } : null,
  };
}

const ASPECT_SET = new Set(["9:16", "16:9", "1:1"]);
const POS_SET = new Set(["top", "middle", "bottom"]);
const STYLE_SET = new Set(["band", "yellow", "outline", "pop"]);
const SIZE_SET = new Set(["s", "m", "l"]);
const UUID = /^[0-9a-f-]{36}$/i;
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** 서버에서 저장 전 검사·정리 — 모양이 다르면 null. 음성 경로는 회원 본인 폴더(userPrefix)만 허용 */
export function sanitizeSaved(raw: unknown, userPrefix: string): SavedProject | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.clips) || r.clips.length > MAX_CLIPS) return null;
  const clips: SavedClip[] = [];
  for (const c of r.clips as Record<string, unknown>[]) {
    if (!c || typeof c !== "object") return null;
    const src = c.source as Record<string, unknown> | undefined;
    const source: ClipSource = src?.kind === "gallery" && typeof src.id === "string" && UUID.test(src.id) ? { kind: "gallery", id: src.id } : { kind: "local" };
    const v = c.voice as Record<string, unknown> | null | undefined;
    const voicePath = v && typeof v.path === "string" && v.path.startsWith(userPrefix) && !v.path.includes("..") ? v.path : null;
    clips.push({
      id: str(c.id, 64) || "clip", name: str(c.name, 120), duration: num(c.duration, 0, 600, 0), trimStart: num(c.trimStart, 0, 600, 0), trimEnd: num(c.trimEnd, 0, 600, 0),
      caption: str(c.caption, 200), narration: str(c.narration, 1000), source,
      voice: voicePath && v ? { path: voicePath, duration: num(v.duration, 0, 600, 0), starts: Array.isArray(v.starts) ? (v.starts as unknown[]).filter((x): x is number => typeof x === "number").slice(0, 400) : null, mime: v.mime === "audio/wav" ? "audio/wav" : "audio/mpeg" } : null,
    });
  }
  const m = r.music as Record<string, unknown> | null | undefined;
  const ms = m?.source as Record<string, unknown> | undefined;
  return {
    v: 1, clips,
    aspect: (ASPECT_SET.has(r.aspect as string) ? r.aspect : "9:16") as EditAspect,
    quality: (r.quality === "1080p" ? "1080p" : "720p") as EditQuality,
    transition: (r.transition === "none" ? "none" : "fade") as Transition,
    captionPosition: (POS_SET.has(r.captionPosition as string) ? r.captionPosition : "bottom") as CaptionPosition,
    captionStyle: (STYLE_SET.has(r.captionStyle as string) ? r.captionStyle : "band") as CaptionStyle,
    captionSize: (SIZE_SET.has(r.captionSize as string) ? r.captionSize : "m") as CaptionSize,
    clipAudio: r.clipAudio === true,
    music: m && typeof m === "object" ? {
      name: str(m.name, 120), volume: num(m.volume, 0, 1, 0.8), fadeOut: m.fadeOut !== false, duck: m.duck !== false,
      source: ms?.kind === "ams" && typeof ms.ref === "string" && /^[0-9a-f-]{36}:\d{1,2}$/i.test(ms.ref) ? { kind: "ams", ref: ms.ref } : { kind: "local" },
    } : null,
  };
}
