// 프로젝트 기본값과 검증(브라우저 저장본·불러온 JSON 파일을 허용 목록·범위로 정리한다).
import { ART_STYLES, ASPECT_RATIOS, GENRES, SCENE_COUNTS, VEO_MODELS, VIDEO_LENGTHS, type SceneCount } from "./presets";
import type { MusicProject, Scene, SongRef } from "./types";

export function newSceneId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultProject(): MusicProject {
  return {
    topic: "",
    genre: GENRES[0].value,
    title: "",
    sunoStyle: "",
    lyrics: "",
    sceneCount: 4,
    extra: "",
    artStyle: "cinematic",
    mood: "",
    scenes: [],
    video: { model: "gemini-omni-1.1-flash", length: 8, loop: false, ratio: "16:9" },
    song: null,
  };
}

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const str = (v: unknown, max: number, fb = ""): string => (typeof v === "string" ? v.slice(0, max) : fb);
const oneOf = <T extends string>(v: unknown, list: { value: T }[], fb: T): T => (list.some((o) => o.value === v) ? (v as T) : fb);

function sanitizeSong(v: unknown): SongRef | null {
  const r = rec(v);
  if (r.source !== "ams" && r.source !== "file") return null;
  const ref = str(r.ref, 64);
  if (r.source === "ams" && !/^[0-9a-f-]{36}:\d{1,2}$/i.test(ref)) return null;
  const d = typeof r.durationS === "number" && Number.isFinite(r.durationS) && r.durationS > 0 ? Math.round(r.durationS) : null;
  return { source: r.source, title: str(r.title, 80) || "내 곡", ...(r.source === "ams" ? { ref } : {}), ...(r.fileName ? { fileName: str(r.fileName, 120) } : {}), durationS: d, ...(r.model ? { model: str(r.model, 60) } : {}) };
}

export function sanitizeProject(raw: unknown): MusicProject {
  const r = rec(raw);
  const fb = defaultProject();
  const video = rec(r.video);
  const scenes: Scene[] = (Array.isArray(r.scenes) ? r.scenes : []).slice(0, 8).map((s, i) => {
    const sr = rec(s);
    return { id: str(sr.id, 64, `s-${i}`), lyric: str(sr.lyric, 300), prompt: str(sr.prompt, 900) };
  });
  const count = (SCENE_COUNTS as readonly number[]).includes(r.sceneCount as number) ? (r.sceneCount as SceneCount) : fb.sceneCount;
  return {
    topic: str(r.topic, 120),
    genre: str(r.genre, 30, fb.genre) || fb.genre,
    title: str(r.title, 60),
    sunoStyle: str(r.sunoStyle, 300),
    lyrics: str(r.lyrics, 3000),
    sceneCount: count,
    extra: str(r.extra, 300),
    artStyle: oneOf(r.artStyle, ART_STYLES, fb.artStyle),
    mood: str(r.mood, 200),
    scenes,
    video: {
      model: oneOf(video.model, VEO_MODELS, fb.video.model),
      length: (VIDEO_LENGTHS as readonly number[]).includes(video.length as number) ? (video.length as 4 | 6 | 8) : fb.video.length,
      loop: typeof video.loop === "boolean" ? video.loop : fb.video.loop,
      ratio: oneOf(video.ratio, ASPECT_RATIOS, fb.video.ratio),
    },
    song: sanitizeSong(r.song),
  };
}
