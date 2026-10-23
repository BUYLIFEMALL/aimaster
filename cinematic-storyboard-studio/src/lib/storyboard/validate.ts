// AI 응답(JSON)을 안전한 형태로 정리한다. 모델이 규칙을 어겨도 화면·저장 데이터는 항상 같은 모양을 유지한다.
import { KEYFRAME_COUNT, type Analysis, type DialogueMode, type Keyframe, type VideoPrompts, type VideoScene } from "./types";
import { formatSeconds, parseSeconds, planDurations } from "./plan";

const str = (v: unknown, max = 2000): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strList = (v: unknown, maxItems = 20): string[] => (Array.isArray(v) ? v.map((x) => str(x, 600)).filter(Boolean).slice(0, maxItems) : []);

export function normalizeKeyframes(raw: unknown): Keyframe[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.slice(0, KEYFRAME_COUNT).map((k, i) => {
    const o = (k ?? {}) as Record<string, unknown>;
    return {
      number: str(o.number, 20) || `KF#${String(i + 1).padStart(2, "0")}`,
      duration: str(o.duration, 20) || "2s",
      shotType: str(o.shotType, 60),
      composition: str(o.composition),
      action: str(o.action),
      camera: str(o.camera),
      lighting: str(o.lighting),
      sound: str(o.sound) || undefined,
    };
  });
}

/** 분석 결과를 검증·정리한다. 키프레임이 모자라면 null(재시도 필요), 넘치면 9개로 자른다. */
export function normalizeAnalysis(raw: unknown): Analysis | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, any>;
  const keyframes = normalizeKeyframes(o.keyframes);
  if (keyframes.length < KEYFRAME_COUNT) return null;
  const a: Analysis = {
    sceneBreakdown: {
      subjects: strList(o.sceneBreakdown?.subjects),
      environment: str(o.sceneBreakdown?.environment),
      visualAnchors: strList(o.sceneBreakdown?.visualAnchors),
    },
    story: { theme: str(o.story?.theme), logline: str(o.story?.logline), emotionalArc: strList(o.story?.emotionalArc, 8) },
    cinematicApproach: {
      shotProgression: str(o.cinematicApproach?.shotProgression),
      cameraMovement: str(o.cinematicApproach?.cameraMovement),
      lensAndExposure: str(o.cinematicApproach?.lensAndExposure),
      lightAndColor: str(o.cinematicApproach?.lightAndColor),
    },
    keyframes,
  };
  return a.story.logline && a.sceneBreakdown.environment ? a : null;
}

/** 영상 프롬프트에 들어가면 영상 AI가 "스토리보드 종이"를 그리게 만드는 단어들 */
const META_RE = /\b(storyboards?|panels?|frames?|images?|pictures?|drawings?|grids?|contact sheets?|captions?)\b/gi;
export const hasMetaWords = (s: string) => new RegExp(META_RE.source, "i").test(s);
const METAFIX: Record<string, string> = { storyboard: "scene", storyboards: "scenes", panel: "shot", panels: "shots", frame: "shot", frames: "shots", image: "scene", images: "scenes", picture: "scene", pictures: "scenes", drawing: "scene", drawings: "scenes", grid: "layout", grids: "layouts", "contact sheet": "scene", "contact sheets": "scenes", caption: "text", captions: "text" };
/** 메타 단어를 영화 장면 용어로 바꾼다("A panel showing…" → "A shot showing…") */
export function stripMetaWords(s: string): string {
  return s.replace(META_RE, (m) => {
    const r = METAFIX[m.toLowerCase()] ?? "scene";
    return m[0] === m[0].toUpperCase() ? r[0].toUpperCase() + r.slice(1) : r;
  });
}

export function normalizeVideoPrompts(raw: unknown, totalSeconds: number, dialogue: DialogueMode): VideoPrompts | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, any>;
  const scenesRaw = Array.isArray(o.scenes) ? o.scenes : [];
  if (scenesRaw.length < KEYFRAME_COUNT) return null;
  const durations = planDurations(totalSeconds);
  const scenes: VideoScene[] = scenesRaw.slice(0, KEYFRAME_COUNT).map((s: any, i: number) => {
    let prompt = stripMetaWords(str(s?.prompt, 3000));
    if (i === 0 && !/^(static cinematic shot|very slow zoom in)/i.test(prompt)) prompt = `Static cinematic shot, ${prompt}`;
    const wantsDialogue = dialogue !== "none" && i !== 0 && i !== KEYFRAME_COUNT - 1;
    return {
      id: str(s?.id, 12) || `S${String(i + 1).padStart(2, "0")}`,
      duration: formatSeconds(durations[i]), // 길이는 항상 계획한 값으로 고정(합계 = 총 길이)
      shotType: str(s?.shotType, 60),
      prompt,
      dialogue: wantsDialogue ? str(s?.dialogue, 600) : "",
    };
  });
  if (scenes.some((s) => !s.prompt)) return null;
  return {
    masterPrompt: {
      style: stripMetaWords(str(o.masterPrompt?.style)),
      character: stripMetaWords(str(o.masterPrompt?.character)),
      environment: stripMetaWords(str(o.masterPrompt?.environment)),
    },
    scenes,
    meta: { totalDuration: formatSeconds(totalSeconds), totalScenes: scenes.length, aspectRatio: str(o.meta?.aspectRatio, 12) || "16:9" },
  };
}

/** 장면 길이 합계(검증용) */
export const sumDurations = (scenes: { duration: string }[]) => scenes.reduce((a, s) => a + (parseSeconds(s.duration) ?? 0), 0);
